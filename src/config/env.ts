import "dotenv/config";
import {
  ALGORAND_MAINNET_GENESIS_HASH,
  ALGORAND_TESTNET_GENESIS_HASH,
  USDC_MAINNET_ASA_ID,
  USDC_TESTNET_ASA_ID,
  isValidAlgorandAddress,
} from "@x402/avm";
import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const EnvSchema = z
  .object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4021),
  OPENROUTER_API_KEY: z.string().default(""),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_MODEL_OVERRIDE: z.string().default(""),
  OPENROUTER_GOAL_MODEL: z.string().min(1),
  OPENROUTER_BASIC_MODEL: z.string().min(1),
  INFERENCE_TEST_MODE: booleanFromEnv,
  X402_PAY_TO: z.string().refine(isValidAlgorandAddress, "must be a valid Algorand address"),
  X402_FACILITATOR_URL: z.string().url().default("https://facilitator.goplausible.xyz"),
  X402_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  X402_ASSET_ID: z.string().default(""),
  X402_ASSET_SYMBOL: z.string().default("USDC"),
  X402_ASSET_DECIMALS: z.coerce.number().int().nonnegative().default(6),
  X402_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(120),
  X402_API_BYPASS_KEY: z.string().optional().default(""),
  X402_CHALLENGE_TAG: z.string().default("x402-global-challenge"),
  X402_SERVICE_NAME: z.string().default("Cost-Aware Inference"),
  X402_ICON_URL: z.string().url().optional(),
  })
  .superRefine((values, context) => {
    const expectedAsset =
      values.X402_NETWORK === "mainnet" ? USDC_MAINNET_ASA_ID : USDC_TESTNET_ASA_ID;

    if (values.X402_ASSET_ID && values.X402_ASSET_ID !== expectedAsset) {
      context.addIssue({
        code: "custom",
        path: ["X402_ASSET_ID"],
        message: `must be ${expectedAsset} for Algorand ${values.X402_NETWORK} USDC`,
      });
    }

    if (!values.INFERENCE_TEST_MODE && !values.OPENROUTER_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["OPENROUTER_API_KEY"],
        message: "is required unless INFERENCE_TEST_MODE=true",
      });
    }

    if (values.X402_NETWORK === "mainnet" && values.INFERENCE_TEST_MODE) {
      context.addIssue({
        code: "custom",
        path: ["INFERENCE_TEST_MODE"],
        message: "must be false on mainnet",
      });
    }

    if (values.NODE_ENV === "production" && values.X402_API_BYPASS_KEY) {
      context.addIssue({
        code: "custom",
        path: ["X402_API_BYPASS_KEY"],
        message: "must be empty in production so paid routes fail closed",
      });
    }
  });

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid inference-gateway environment configuration.");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const values = parsed.data;
const x402AssetId =
  values.X402_NETWORK === "mainnet" ? USDC_MAINNET_ASA_ID : USDC_TESTNET_ASA_ID;
// GoPlausible currently advertises the full genesis-hash CAIP-2 form from /supported.
// The AVM SDK accepts both forms, but facilitator capability matching is exact.
const x402NetworkCaip2 = `algorand:${
  values.X402_NETWORK === "mainnet"
    ? ALGORAND_MAINNET_GENESIS_HASH
    : ALGORAND_TESTNET_GENESIS_HASH
}` as `algorand:${string}`;

export const env = {
  ...values,
  X402_ASSET_ID: x402AssetId,
  x402NetworkCaip2,
} as const;
