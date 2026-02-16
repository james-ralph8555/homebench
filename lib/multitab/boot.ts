/**
 * @fileoverview Multi-tab DuckDB boot sequence and coordination
 * 
 * This module implements the leader election and heartbeat system that runs
 * in every tab to coordinate shared OPFS-backed DuckDB access across multiple
 * browser tabs in HomeBench.
 */

import { 
  ProtocolMessage,
  createHeartbeat,
  createConnect,
  createConnectAck,
  isHeartbeat,
  isConnect,
  isConnectAck,
  generateSenderId,
  PROTOCOL_VERSION
} from './protocol';
import { 
  DEFAULT_MULTITAB_CONFIG, 
  MultiTabConfig, 
  LeaderConnectionError, 
  SqlRequest,
  SqlResponse
} from './types';
import { logger } from '@/lib/logger';

// =============================================================================
// GLOBAL STATE
// =============================================================================

let config = DEFAULT_MULTITAB_CONFIG;
let senderId = '';
let isInitialized = false;
let isLeader = false;
let lastHeartbeat = Date.now();
let channel: BroadcastChannel;
let leaderPortFactory: ((port: MessagePort) => void) | null = null;
let mockPortHandler: ((event: any) => void) | null = null;
let heartbeatTimer: number | null = null;
let livenessTimer: number | null = null;

// =============================================================================
// LEADER ELECTION & BOOT SEQUENCE
// =============================================================================

/**
 * Initialize the multi-tab coordination system.
 * This function should be called once per tab on startup.
 * 
 * @param customConfig - Optional configuration overrides
 */
export async function boot(customConfig?: Partial<MultiTabConfig>): Promise<void> {
  if (isInitialized) {
    logger.warn('Multi-tab system already initialized');
    return;
  }

  // Merge configuration
  config = { ...DEFAULT_MULTITAB_CONFIG, ...customConfig };
  
  // Generate unique sender ID for this tab
  senderId = generateSenderId();
  
  // Initialize broadcast channel for control messages
  channel = new BroadcastChannel(config.channelName);
  
  logger.info('Starting multi-tab DuckDB coordination...');

  // Set up heartbeat listener before attempting leadership
  setupHeartbeatListener();
  
  // Add a small random delay to reduce race conditions between tabs
  const delay = Math.random() * 200; // 0-200ms random delay
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Wait for leadership election to complete before returning
  await new Promise<void>((resolve) => {
    let roleDecided = false;
    
    // Set up temporary heartbeat listener
    const originalHandler = channel.onmessage;
    channel.onmessage = (event: MessageEvent<ProtocolMessage>) => {
      const msg = event.data;
      if (isHeartbeat(msg) && !roleDecided) {
        logger.info('Detected existing leader via heartbeat - becoming client');
        roleDecided = true;
        isLeader = false;
        startClient().then(resolve);
      }
      // Call original handler if it exists
      if (originalHandler) {
        originalHandler.call(channel, event);
      }
    };
    
    // Wait for potential heartbeats, then attempt leadership if none found
    setTimeout(() => {
      if (!roleDecided) {
        logger.info('No heartbeats detected - attempting leadership');
        roleDecided = true;
        attemptLeadership().then(resolve);
      }
    }, 200); // Wait 200ms for heartbeats
  });
  
  isInitialized = true;
}

/**
 * Attempt to acquire leadership via Web Locks API
 */
async function attemptLeadership(): Promise<void> {
  logger.info('Attempting to acquire leadership lock...');
  
  // Check if Web Locks API is supported
  if (!('locks' in navigator)) {
    logger.warn('Web Locks API not supported - using fallback leader election');
    // Simple fallback: first tab wins (not ideal but functional)
    isLeader = true;
    await startLeader();
    return;
  }
  
  try {
    // Query existing locks first
    const lockState = await navigator.locks.query();
    logger.debug(`Current locks:`, lockState.held?.map(l => l.name));
    const existingLock = lockState.held?.find(lock => lock.name === config.lockName);
    
    if (existingLock) {
      logger.info('Leadership lock already held by another tab - becoming client');
      isLeader = false;
      await startClient();
      return;
    } else {
      logger.info('No existing leadership lock found - attempting to acquire');
    }
    
    // Try to acquire the lock for the lifetime of this tab
    const lockPromise = navigator.locks.request(config.lockName, 
      { mode: 'exclusive', ifAvailable: true }, 
      async (lock) => {
        if (lock) {
          logger.info('Successfully acquired leadership lock');
          isLeader = true;
          await startLeader();
          
          // Keep the lock for the lifetime of this tab
          // Return a promise that never resolves to hold the lock
          return new Promise<void>(() => {
            // Lock will be automatically released when tab closes
          });
        } else {
          logger.info('Leadership lock already taken - becoming client');
          isLeader = false;
          await startClient();
          return; // Release immediately for clients
        }
      }
    );
    
    // Don't await the lock promise if we're the leader (it never resolves)
    // Just wait a moment for the leader/client determination
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    logger.error('Failed to acquire leadership lock:', error);
    // Fallback to client mode
    logger.info('Falling back to client mode');
    isLeader = false;
    await startClient();
  }
}

/**
 * Set up heartbeat message listener
 */
function setupHeartbeatListener(): void {
  channel.onmessage = (event: MessageEvent<ProtocolMessage>) => {
    const msg = event.data;
    
    if (isHeartbeat(msg)) {
      // Update last heartbeat timestamp from leader
      lastHeartbeat = Date.now();
    } else if (isConnectAck(msg)) {
      // Leader acknowledged our connection request
      if (leaderPortFactory) {
        logger.info('Received connection acknowledgment from leader');
        // Create a mock MessagePort since we're using BroadcastChannel directly
        const mockPort = {
          postMessage: (data: any) => {
            logger.debug('Client sending query:', data);
            channel.postMessage({ type: 'query', payload: data });
          },
          onmessage: null,
          onmessageerror: null,
          start: () => {},
          close: () => {}
        } as any;
        
        // Set up the handler for this mock port so responses get forwarded to it
        mockPortHandler = (event: any) => {
          if (mockPort.onmessage) {
            mockPort.onmessage(event);
          }
        };
        
        leaderPortFactory(mockPort);
        leaderPortFactory = null;
      }
    } else if ((msg as any).type === 'query_response') {
      // Forward query responses to the client's mock port handler
      // Note: query_response is a legacy message type not in the typed protocol
      if (!isLeader && mockPortHandler) {
        // Extract the response data from the broadcast message
        const { type, ...responseData } = msg as any;
        logger.debug('Client received query response:', responseData);
        mockPortHandler({ data: responseData });
      }
    }
  };
}

/**
 * Start liveness monitoring for clients
 * Attempts re-election if leader heartbeat stops
 */
function startLivenessMonitor(): void {
  livenessTimer = window.setInterval(async () => {
    if (isLeader) return; // Don't monitor if we're the leader
    
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
    const heartbeatTimeout = config.heartbeatInterval * config.heartbeatGracePeriods;
    
    if (timeSinceLastHeartbeat > heartbeatTimeout) {
      logger.warn('Leader heartbeat lost, attempting re-election...');
      
      // Try to become the new leader
      try {
        await navigator.locks.request(config.lockName, 
          { mode: 'exclusive', ifAvailable: true }, 
          async (lock) => {
            if (lock) {
              logger.info('Elected as new leader after crash');
              isLeader = true;
              await startLeader();
              
              // Stop liveness monitoring since we're now the leader
              if (livenessTimer) {
                clearInterval(livenessTimer);
                livenessTimer = null;
              }
            }
          }
        );
      } catch (error) {
        logger.error('Failed to acquire leadership during re-election:', error);
      }
    }
  }, config.heartbeatInterval);
}

// =============================================================================
// LEADER STARTUP
// =============================================================================

/**
 * Initialize this tab as the leader
 */
async function startLeader(): Promise<void> {
  logger.info('Starting as leader tab...');
  
  // Start heartbeat broadcasting
  startHeartbeat();
  
  // Set up connection acceptance
  setupConnectionAcceptance();
  
  // Note: Leader DuckDB initialization will be handled by DuckDBManager
  // to avoid circular dependencies. The manager will call setLeaderDatabase.
  
  logger.info('Leader initialization complete');
  logger.info('Multi-tab system initialized as LEADER');
}

/**
 * Start broadcasting heartbeat messages
 */
function startHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  
  heartbeatTimer = window.setInterval(() => {
    if (isLeader) {
      const heartbeat = createHeartbeat(senderId, true, 0);
      channel.postMessage(heartbeat);
    }
  }, config.heartbeatInterval);
}

/**
 * Set up listener for client connection requests and query messages
 */
function setupConnectionAcceptance(): void {
  const originalListener = channel.onmessage;
  
  channel.onmessage = (event: MessageEvent<ProtocolMessage | any>) => {
    // Call original listener first (for heartbeat handling)
    if (originalListener) {
      originalListener.call(channel, event);
    }
    
    const msg = event.data;
    
    if (isLeader) {
      if (isConnect(msg)) {
        handleConnectionRequest(event);
      } else if (msg.type === 'query') {
        // Handle query messages from clients
        logger.debug('Leader received query:', msg);
        handleQueryMessage(msg.payload);
      }
    }
  };
}

/**
 * Handle incoming client connection requests
 */
async function handleConnectionRequest(event: MessageEvent<ProtocolMessage>): Promise<void> {
  logger.debug('Leader received connection request');
  
  const msg = event.data;
  if (!isConnect(msg)) return;
  
  // For now, just acknowledge that we're ready to handle queries
  // Queries will be handled directly via BroadcastChannel
  const ack = createConnectAck(senderId, msg.clientId, true);
  channel.postMessage(ack);
  
  logger.info('Client connection acknowledged');
}

/**
 * Handle query messages from clients via BroadcastChannel
 */
async function handleQueryMessage(queryData: any): Promise<void> {
  logger.debug('Leader handling query:', queryData);
  // Import leader functions to handle the actual query execution
  const { handleBroadcastQuery } = await import('./leader');
  
  try {
    await handleBroadcastQuery(queryData, channel);
    logger.debug('Leader completed query:', queryData.id);
  } catch (error) {
    logger.error('Leader failed to handle query:', error);
    // Send error response back to client
    const errorResponse: SqlResponse = {
      id: queryData.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
    channel.postMessage({ type: 'query_response', ...errorResponse });
  }
}

// =============================================================================
// CLIENT STARTUP
// =============================================================================

/**
 * Initialize this tab as a client
 */
async function startClient(): Promise<void> {
  logger.info('Starting as client tab...');
  
  // Initialize the client's connection to leader
  const { initializeClient } = await import('./client');
  await initializeClient(requestLeaderConnection);
  
  logger.info('Client initialization complete');
  logger.info('Multi-tab system initialized as CLIENT');
  
  // Start liveness monitoring for clients
  startLivenessMonitor();
}

/**
 * Request a dedicated connection from the leader
 */
function requestLeaderConnection(callback: (port: MessagePort) => void): void {
  if (!channel) {
    throw new LeaderConnectionError('Broadcast channel not initialized');
  }
  
  leaderPortFactory = callback;
  
  // Send connection request
  logger.info('Requesting connection to leader...');
  const connect = createConnect(senderId, PROTOCOL_VERSION);
  channel.postMessage(connect);
  
  // Wait for connect_ack, then simulate a successful connection
  // For now, we'll use the BroadcastChannel directly instead of MessagePorts
}

// =============================================================================
// CLEANUP & STATE
// =============================================================================

/**
 * Get current multi-tab state
 */
export function getMultiTabState() {
  return {
    isInitialized,
    isLeader,
    lastHeartbeat,
    timeSinceLastHeartbeat: Date.now() - lastHeartbeat,
    config,
  };
}

/**
 * Cleanup multi-tab resources
 */
export function cleanup(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  
  if (livenessTimer) {
    clearInterval(livenessTimer);
    livenessTimer = null;
  }
  
  try {
    channel?.close();
  } catch {}
  
  isInitialized = false;
  isLeader = false;
  leaderPortFactory = null;
  
  logger.info('Multi-tab system cleaned up');
}
