/**
 * X402: Partner Service Registry
 *
 * X402: This entire module is for x402 payment mode with BlockRun API proxy.
 * X402: For API Key mode, this functionality is disabled.
 *
 * X402: Defines available partner APIs that can be called through ClawRouter's proxy.
 * X402: Partners provide specialized data (Twitter/X, etc.) via x402 micropayments.
 * X402: The same wallet used for LLM calls pays for partner API calls — zero extra setup.
 */

// X402: export type PartnerServiceParam = {
// X402:   name: string;
// X402:   type: "string" | "string[]" | "number";
// X402:   description: string;
// X402:   required: boolean;
// X402: };

// X402: export type PartnerServiceDefinition = {
// X402:   /** Unique service ID used in tool names: blockrun_{id} */
// X402:   id: string;
// X402:   /** Human-readable name */
// X402:   name: string;
// X402:   /** Partner providing this service */
// X402:   partner: string;
// X402:   /** Short description for tool listing */
// X402:   description: string;
// X402:   /** Proxy path (relative to /v1) */
// X402:   proxyPath: string;
// X402:   /** HTTP method */
// X402:   method: "GET" | "POST";
// X402:   /** Parameters for tool's JSON Schema */
// X402:   params: PartnerServiceParam[];
// X402:   /** Pricing info for display */
// X402:   pricing: {
// X402:     perUnit: string;
// X402:     unit: string;
// X402:     minimum: string;
// X402:     maximum: string;
// X402:   };
// X402:   /** Example usage for help text */
// X402:   example: {
// X402:     input: Record<string, unknown>;
// X402:     description: string;
// X402:   };
// X402: };

// X402: /**
// X402:  * All registered partner services.
// X402:  * New partners are added here — rest of the system picks them up automatically.
// X402:  */
// X402: export const PARTNER_SERVICES: PartnerServiceDefinition[] = [
// X402:   {
// X402:     id: "x_users_lookup",
// X402:     name: "Twitter/X User Lookup",
// X402:     partner: "AttentionVC",
// X402:     description:
// X402:       "ALWAYS use this tool to look up real-time Twitter/X user profiles. " +
// X402:       "Call this when a user asks about any Twitter/X account, username, handle, " +
// X402:       "follower count, verification status, bio, or profile. " +
// X402:       "Do NOT answer Twitter/X user questions from memory — always fetch live data with this tool. " +
// X402:       "Returns: follower count, verification badge, bio, location, join date. " +
// X402:       "Accepts up to 100 usernames per request (without @ prefix).",
// X402:     proxyPath: "/x/users/lookup",
// X402:     method: "POST",
// X402:     params: [
// X402:       {
// X402:         name: "usernames",
// X402:         type: "string[]",
// X402:         description:
// X402:           'Array of Twitter/X usernames to look up (without @ prefix). Example: ["elonmusk", "naval", "balaboris"]',
// X402:         required: true,
// X402:       },
// X402:     ],
// X402:     pricing: {
// X402:       perUnit: "$0.001",
// X402:       unit: "user",
// X402:       minimum: "$0.01 (10 users)",
// X402:       maximum: "$0.10 (100 users)",
// X402:     },
// X402:     example: {
// X402:       input: { usernames: ["elonmusk", "naval", "balaboris"] },
// X402:       description: "Look up 3 Twitter/X user profiles",
// X402:     },
// X402:   },
// X402: ];

// X402: /**
// X402:  * Get a partner service by ID.
// X402:  */
// X402: export function getPartnerService(id: string): PartnerServiceDefinition | undefined {
// X402:   return PARTNER_SERVICES.find((s) => s.id === id);
// X402: }
