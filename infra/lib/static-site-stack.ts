import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Size,
  Stack,
  StackProps,
} from 'aws-cdk-lib'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import {
  AllowedMethods,
  BehaviorOptions,
  CachePolicy,
  CachedMethods,
  Distribution,
  ErrorResponse,
  OriginRequestCookieBehavior,
  OriginRequestHeaderBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront'
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront'
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
} from 'aws-cdk-lib/aws-s3'
import { BucketDeployment, CacheControl, Source } from 'aws-cdk-lib/aws-s3-deployment'
import { existsSync } from 'fs'
import path from 'path'
import { Construct } from 'constructs'

export interface HomebenchSiteStackProps extends StackProps {
  domainName?: string
  certificateArn?: string
}

export class HomebenchSiteStack extends Stack {
  constructor(scope: Construct, id: string, props: HomebenchSiteStackProps = {}) {
    super(scope, id, props)

    const contextDist = this.node.tryGetContext('distPath') as string | undefined
    const defaultDist = path.resolve(process.cwd(), '../out')
    const distPath = contextDist ?? defaultDist

    const hasDist = existsSync(distPath)
    if (!hasDist) {
      // eslint-disable-next-line no-console
      console.warn(
        `Static export not found at: ${distPath}. Skipping asset deployment for HomebenchSiteStack. Build with 'npm run build' or pass '-c distPath=/abs/path' when deploying this stack.`,
      )
    }

    if (props.certificateArn && !props.domainName) {
      throw new Error('domainName is required when certificateArn is provided.')
    }

    const siteBucket = new Bucket(this, 'SiteBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      cors: [
        {
          allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    })

    const originAccessIdentity = new OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: 'Access identity for the Homebench static site bucket',
    })

    const crossOriginIsolationHeaders = [
      {
        header: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
        override: true,
      },
      {
        header: 'Cross-Origin-Embedder-Policy',
        value: 'require-corp',
        override: true,
      },
    ]

    const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'ResponseHeadersPolicy', {
      customHeadersBehavior: {
        customHeaders: crossOriginIsolationHeaders,
      },
    })

    const duckdbResponseHeadersPolicy = new ResponseHeadersPolicy(
      this,
      'DuckdbResponseHeadersPolicy',
      {
        customHeadersBehavior: {
          customHeaders: [
            ...crossOriginIsolationHeaders,
            {
              header: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
              override: true,
            },
            {
              header: 'Vary',
              value: 'Accept-Encoding',
              override: true,
            },
          ],
        },
      },
    )

    const originPolicy = new OriginRequestPolicy(this, 'OriginRequestPolicy', {
      cookieBehavior: OriginRequestCookieBehavior.none(),
      headerBehavior: OriginRequestHeaderBehavior.none(),
      queryStringBehavior: OriginRequestQueryStringBehavior.none(),
    })

    const defaultBehavior: BehaviorOptions = {
      origin: S3BucketOrigin.withOriginAccessIdentity(siteBucket, {
        originAccessIdentity,
      }),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      originRequestPolicy: originPolicy,
      responseHeadersPolicy,
      compress: true,
    }

    const duckdbBehavior: BehaviorOptions = {
      ...defaultBehavior,
      responseHeadersPolicy: duckdbResponseHeadersPolicy,
    }

    const errorResponses: ErrorResponse[] = [
      {
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: Duration.minutes(5),
      },
      {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: Duration.minutes(5),
      },
    ]

    const distribution = new Distribution(this, 'SiteDistribution', {
      defaultBehavior,
      additionalBehaviors: {
        'duckdb/*/*.wasm': duckdbBehavior,
        'duckdb/*/*.js': duckdbBehavior,
      },
      defaultRootObject: 'index.html',
      comment: 'Homebench static site distribution',
      errorResponses,
      ...(props.certificateArn
        ? {
            certificate: acm.Certificate.fromCertificateArn(
              this,
              'DistributionCertificate',
              props.certificateArn,
            ),
            domainNames: [props.domainName!, `www.${props.domainName!}`],
          }
        : {}),
    })

    if (hasDist) {
      const siteDeployment = new BucketDeployment(this, 'DeployWithInvalidation', {
        sources: [Source.asset(distPath)],
        destinationBucket: siteBucket,
        distribution,
        distributionPaths: ['/*'],
        cacheControl: [CacheControl.fromString('public, max-age=0, must-revalidate')],
        prune: true,
        memoryLimit: 2048,
        ephemeralStorageSize: Size.mebibytes(2048),
      })

      const duckdbDistPath = path.join(distPath, 'duckdb')
      if (existsSync(duckdbDistPath)) {
        const duckdbDeployment = new BucketDeployment(this, 'DeployDuckdbAssets', {
          sources: [Source.asset(duckdbDistPath)],
          destinationBucket: siteBucket,
          destinationKeyPrefix: 'duckdb',
          distribution,
          distributionPaths: ['/duckdb/*'],
          cacheControl: [CacheControl.fromString('public, max-age=31536000, immutable')],
          prune: true,
          memoryLimit: 2048,
          ephemeralStorageSize: Size.mebibytes(2048),
        })

        duckdbDeployment.node.addDependency(siteDeployment)
      }
    }

    new CfnOutput(this, 'BucketName', {
      value: siteBucket.bucketName,
    })

    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
    })

    new CfnOutput(this, 'CloudFrontDomainName', {
      value: distribution.domainName,
    })
  }
}
