#!/usr/bin/env node
import 'source-map-support/register'
import { App, Environment } from 'aws-cdk-lib'
import { HomebenchCertificateStack } from '../lib/certificate-stack'
import { HomebenchSiteStack } from '../lib/static-site-stack'

const app = new App()

const domainName = (app.node.tryGetContext('domainName') as string | undefined) ?? 'homebench.casa'

const defaultAccount = process.env.CDK_DEFAULT_ACCOUNT
const defaultRegion = process.env.CDK_DEFAULT_REGION

const certificateEnv: Environment = {
  account: process.env.CERTIFICATE_ACCOUNT ?? defaultAccount,
  region: process.env.CERTIFICATE_REGION ?? 'us-east-1',
}

new HomebenchCertificateStack(app, 'HomebenchCertificateStack', {
  env: certificateEnv,
  domainName,
})

const siteEnv: Environment = {
  account: process.env.SITE_ACCOUNT ?? defaultAccount,
  region: process.env.SITE_REGION ?? defaultRegion,
}

const certificateArn = app.node.tryGetContext('certificateArn') as string | undefined

new HomebenchSiteStack(app, 'HomebenchSiteStack', {
  env: siteEnv,
  domainName,
  certificateArn,
})
