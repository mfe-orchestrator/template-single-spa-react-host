import { globalVariables } from '@mfe-orchestrator-hub/client'
import type { ApplicationInsights } from '@microsoft/applicationinsights-web'

/**
 * The cloud role name this host reports to Application Insights: what the application map and the
 * `cloud_RoleName` column show, so the browser telemetry never mixes with the backends'. Rename it
 * after your host.
 */
const ROLE_NAME = 'single-spa-host-react'

/**
 * Hosts the browser sends the correlation headers to (traceparent, tracestate, Request-Id,
 * Request-Context). Same origin only, by default: add the host of each backend this app calls,
 * ex. 'api.example.com' or '*.example.com', once its CORS allows those headers — a backend that
 * does not fails the browser preflight, and with it the call.
 */
const CORRELATED_HOSTS = [window.location.host]

declare global {
  interface Window {
    /**
     * The host's Application Insights, shared with every microfrontend on the page. Set once the
     * SDK has loaded; never set when the environment has no APPLICATIONINSIGHTS_CONNECTION_STRING.
     */
    appInsights?: ApplicationInsights
  }
}

/**
 * Starts Application Insights when the environment's global variables carry
 * APPLICATIONINSIGHTS_CONNECTION_STRING. Without it this does nothing: the SDK is a chunk of its
 * own, and it is not even downloaded.
 */
export const startTelemetry = async (): Promise<void> => {
  // Telemetry is optional: a manifest that cannot be read is reported by whatever loads the
  // remotes, never here, so a host without Application Insights never logs because of it.
  const variables = await globalVariables().catch(() => undefined)
  const connectionString = variables?.['APPLICATIONINSIGHTS_CONNECTION_STRING']?.trim()
  if (!connectionString) return

  try {
    const { ApplicationInsights, DistributedTracingModes } = await import('@microsoft/applicationinsights-web')
    const appInsights = new ApplicationInsights({
      config: {
        connectionString,
        enableAutoRouteTracking: true,
        enableCorsCorrelation: true,
        distributedTracingMode: DistributedTracingModes.AI_AND_W3C,
        correlationHeaderDomains: CORRELATED_HOSTS
      }
    })
    appInsights.addTelemetryInitializer(item => {
      item.tags = { ...item.tags, 'ai.cloud.role': ROLE_NAME }
    })
    appInsights.loadAppInsights()
    appInsights.trackPageView()
    window.appInsights = appInsights
  } catch (error) {
    console.error('[telemetry] Application Insights could not start', error)
  }
}
