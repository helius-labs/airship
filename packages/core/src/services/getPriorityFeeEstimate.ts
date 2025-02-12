import * as web3 from "@solana/web3.js";
import { logger } from "./logger";
import bs58 from 'bs58';

export async function getPriorityFeeEstimate(url: string, priorityLevel: "Min" | "Low" | "Medium" | "High" | "VeryHigh" | "UnsafeMax", transaction: web3.VersionedTransaction): Promise<number | null> {
    try {        
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "helius-airship",
          method: "getPriorityFeeEstimate",
          params: [
            {
              transaction: bs58.encode(transaction.serialize()),
              options: { 
                priorityLevel: priorityLevel,
                evaluateEmptySlotAsZero: true,
                lookbackSlots: 150,
              },
            },
          ],
        }),
      });
  
      if (!response.ok) {
        logger.error(`Failed to get priority fee estimate. Status: ${response.status}`);
        return null;
      }
  
      const data = await response.json();
  
      if (data.error) {
        logger.error(`RPC error getting priority fee estimate: ${data.error.message}`);
        return null;
      }
  
      if (!data.result || typeof data.result.priorityFeeEstimate !== 'number') {
        logger.error('Invalid priority fee estimate response format');
        return null;
      }
  
      return data.result.priorityFeeEstimate;
  
    } catch (error) {
      logger.error('Error getting priority fee estimate:', error);
      return null;
    }
  }
