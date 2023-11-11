import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { aws_elasticloadbalancingv2 as elbv2 } from 'aws-cdk-lib';
import { CfnVpcLink } from 'aws-cdk-lib/aws-apigateway';
import { CfnApi, CfnStage, CfnRoute, CfnIntegration, CfnRouteResponse, CfnIntegrationResponse } from 'aws-cdk-lib/aws-apigatewayv2';
import { CfnLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

interface TransformedStackProps extends cdk.StackProps {
    readonly appName: string;
    readonly envName: string;
}
type RouteInfo = {
    action: string,
    httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'ANY',
    path: string,
}

const routes: RouteInfo[] = [{
    action:'getItems',
    httpMethod: 'GET',
    path: 'items'
}, {
    action: 'addItems',
    httpMethod: 'POST',
    path: 'items'
}]

export class TransformedStack extends cdk.Stack {
    public readonly template: cdk.cloudformation_include.CfnInclude;
    public readonly appName: string;
    public readonly envName: string;

    constructor (scope: cdk.App, id: string, props: TransformedStackProps) {
        super(scope, id, props);
        this.template = new cdk.cloudformation_include.CfnInclude(this, 'Template', {
            templateFile: path.join('.build', 'in.yml'),
        });
        this.appName = props.appName;
        this.envName = props.envName;

        const networkLoadBalancer = this.transformPublicNetworkLoadBalancerToInternal();
        const { link, api } = this.createApiAndVpcLink(networkLoadBalancer);
        this.createConnectionRoutes(api, link, networkLoadBalancer);
        routes.forEach(routeInfo => this.createWebSocketRoute(api, link, networkLoadBalancer, routeInfo));
    }
    // make NLB internal
    transformPublicNetworkLoadBalancerToInternal() {
        const publicNetworkLoadBalancer = this.template.getResource("PublicNetworkLoadBalancer") as elbv2.CfnLoadBalancer;
        publicNetworkLoadBalancer.scheme = 'internal';
        return publicNetworkLoadBalancer;
    }   

    createApiAndVpcLink(internalNetworkLoadBalancer: CfnLoadBalancer) {
        const link = new CfnVpcLink(this, 'VpcLink', {
            name: `${this.appName}-${this.envName}-vpc-link`,
            targetArns: [internalNetworkLoadBalancer.ref]
        });

        const api = new CfnApi(this, 'API-1', {
            name: `${this.appName}-${this.envName}-api-1`,
            protocolType: 'WEBSOCKET',
            routeSelectionExpression: '$request.body.action',
            apiKeySelectionExpression: '$request.header.x-api-key',
        });

        const stage = new CfnStage(this, 'Stage', {
            apiId: api.ref,
            stageName: `${this.envName}-stage`,
            autoDeploy: true,
        });

        return { link, api };
    }

    createConnectionRoutes(api: CfnApi, link: CfnVpcLink, nlb: CfnLoadBalancer) {
        const routesInfo: RouteInfo[] = [{
            action:'$connect',
            httpMethod: 'POST',
            path: 'connect',
        }, {
            action:'$disconnect',
            httpMethod: 'POST',
            path: 'disconnect',
        }];

        routesInfo.forEach(routeInfo => this.createRouteNoRes(api, link, nlb, routeInfo, routeInfo.action, true));
    }
    
    createWebSocketRoute(api: CfnApi, link: CfnVpcLink, nlb: CfnLoadBalancer, routeInfo: RouteInfo) {
        const suffix = routeInfo.action;
        
        const {route, integration} = this.createRouteNoRes(api, link, nlb, routeInfo, suffix);

        const routeResponse = new CfnRouteResponse(this, `RouteResponse${suffix}`, {
            apiId: api.ref,
            routeId: route.ref,
            routeResponseKey: '$default',
        });

        const integrationResponse = new CfnIntegrationResponse(this, `IntegrationResponse${suffix}`, {
            apiId: api.ref,
            integrationId: integration.ref,
            integrationResponseKey: '/2\\d\\d/',
            responseTemplates: {
                "$default": `{"type": "${routeInfo.action}", "data": $input.body}`
            },
            templateSelectionExpression: "\\$default"
        });
    }

    createRouteNoRes(api: CfnApi, link: CfnVpcLink, nlb: CfnLoadBalancer, routeInfo: RouteInfo, suffix: string, isProxy?: boolean){
        const integration = new CfnIntegration(this, `Integration${suffix}`, {
            apiId: api.ref,
            integrationType: isProxy ? 'HTTP_PROXY' : 'HTTP',
            integrationUri: `http://${nlb.attrDnsName}/${routeInfo.path}`,
            integrationMethod: routeInfo.httpMethod,
            connectionType: 'VPC_LINK',
            connectionId: link.ref,
            requestParameters: {
                'integration.request.header.sessionid': 'context.connectionId',
            }
        });

        const route = new CfnRoute(this, `Route${suffix}`, {
            apiId: api.ref,
            routeKey: routeInfo.action,
            target: `integrations/${integration.ref}`,
            authorizationType: 'NONE',
            apiKeyRequired: false,
        });

        return { route, integration };
    }
}