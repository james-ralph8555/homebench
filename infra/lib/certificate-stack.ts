import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import { Construct } from 'constructs'

export interface HomebenchCertificateStackProps extends StackProps {
  domainName: string
}

export class HomebenchCertificateStack extends Stack {
  public readonly certificate: acm.Certificate

  constructor(scope: Construct, id: string, props: HomebenchCertificateStackProps) {
    super(scope, id, props)

    const { domainName } = props

    this.certificate = new acm.Certificate(this, 'SiteCertificate', {
      domainName,
      subjectAlternativeNames: [`www.${domainName}`],
      validation: acm.CertificateValidation.fromDns(),
    })

    new CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ARN of the ACM certificate (us-east-1)',
      exportName: 'HomebenchCertificateArn',
    })
  }
}
