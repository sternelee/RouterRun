/**
 * X402: Partner Tool Builder
 *
 * X402: This entire module is for x402 payment mode with BlockRun API proxy.
 * X402: For API Key mode, this functionality is disabled.
 *
 * X402: Converts partner service definitions into OpenClaw tool definitions.
 * X402: Each tool's execute() calls through the local proxy which handles
 * X402: x402 payment transparently using the same wallet.
 */

// X402: import { PARTNER_SERVICES, type PartnerServiceDefinition } from "./registry.js";

// X402: /** OpenClaw tool definition shape (duck-typed) */
// X402: export type PartnerToolDefinition = {
// X402:   name: string;
// X402:   description: string;
// X402:   parameters: {
// X402:     type: "object";
// X402:     properties: Record<string, unknown>;
// X402:     required: string[];
// X402:   };
// X402:   execute: (toolCallId: string, params: Record<string, unknown>) => Promise<unknown>;
// X402: };

// X402: /**
// X402:  * Build a single partner tool from a service definition.
// X402:  */
// X402: function buildTool(service: PartnerServiceDefinition, proxyBaseUrl: string): PartnerToolDefinition {
// X402:   // Build JSON Schema properties from service params
// X402:   const properties: Record<string, unknown> = {};
// X402:   const required: string[] = [];

// X402:   for (const param of service.params) {
// X402:     const prop: Record<string, unknown> = {
// X402:       description: param.description,
// X402:     };

// X402:     if (param.type === "string[]") {
// X402:       prop.type = "array";
// X402:       prop.items = { type: "string" };
// X402:     } else {
// X402:       prop.type = param.type;
// X402:     }

// X402:     properties[param.name] = prop;
// X402:     if (param.required) {
// X402:       required.push(param.name);
// X402:     }
// X402:   }

// X402:   return {
// X402:     name: `blockrun_${service.id}`,
// X402:     description: [
// X402:       service.description,
// X402:       "",
// X402:       `Partner: ${service.partner}`,
// X402:       `Pricing: ${service.pricing.perUnit} per ${service.pricing.unit} (min: ${service.pricing.minimum}, max: ${service.pricing.maximum})`,
// X402:     ].join("\n"),
// X402:     parameters: {
// X402:       type: "object",
// X402:       properties,
// X402:       required,
// X402:     },
// X402:     execute: async (_toolCallId: string, params: Record<string, unknown>) => {
// X402:       const url = `${proxyBaseUrl}/v1${service.proxyPath}`;
// X402:
// X402:       const response = await fetch(url, {
// X402:         method: service.method,
// X402:         headers: { "Content-Type": "application/json" },
// X402:         body: JSON.stringify(params),
// X402:       });
// X402:
// X402:       if (!response.ok) {
// X402:         const errText = await response.text().catch(() => "");
// X402:         throw new Error(
// X402:           `Partner API error (${response.status}): ${errText || response.statusText}`,
// X402:         );
// X402:       }
// X402:
// X402:       const data = await response.json();
// X402:       return {
// X402:         content: [
// X402:           {
// X402:             type: "text",
// X402:             text: JSON.stringify(data, null, 2),
// X402:           },
// X402:         ],
// X402:         details: data,
// X402:       };
// X402:     },
// X402:   };
// X402: }

// X402: /**
// X402:  * Build OpenClaw tool definitions for all registered partner services.
// X402:  * @param proxyBaseUrl - Local proxy base URL (e.g., "http://127.0.0.1:8402")
// X402:  */
// X402: export function buildPartnerTools(proxyBaseUrl: string): PartnerToolDefinition[] {
// X402:   return PARTNER_SERVICES.map((service) => buildTool(service, proxyBaseUrl));
// X402: }
