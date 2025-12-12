/**
 * Exchange Rate Service
 * Fetches USD Blue rate from Bluelytics API (Argentina)
 */

interface BluelyticsResponse {
    oficial: { value_avg: number; value_sell: number; value_buy: number };
    blue: { value_avg: number; value_sell: number; value_buy: number };
    oficial_euro: { value_avg: number; value_sell: number; value_buy: number };
    blue_euro: { value_avg: number; value_sell: number; value_buy: number };
    last_update: string;
}

interface ExchangeRateCache {
    rate: number;
    timestamp: number;
}

// Cache duration: 1 hour
const CACHE_DURATION_MS = 60 * 60 * 1000;

let cache: ExchangeRateCache | null = null;

/**
 * Get current USD Blue exchange rate from Bluelytics API
 * Uses cached value if available and not expired
 * @returns Promise<number> - The USD Blue sell rate, or 0 if unavailable
 */
export async function getUsdBlueRate(): Promise<number> {
    // Check cache first
    if (cache && (Date.now() - cache.timestamp) < CACHE_DURATION_MS) {
        return cache.rate;
    }

    try {
        const response = await fetch('https://api.bluelytics.com.ar/v2/latest', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.warn('Bluelytics API returned non-OK status:', response.status);
            return cache?.rate || 0;
        }

        const data: BluelyticsResponse = await response.json();

        // Use the blue sell rate (venta)
        const rate = data.blue.value_sell;

        // Update cache
        cache = {
            rate,
            timestamp: Date.now(),
        };

        return rate;
    } catch (error) {
        console.error('Error fetching USD rate from Bluelytics:', error);
        // Return cached value if available, otherwise 0
        return cache?.rate || 0;
    }
}

/**
 * Convert ARS amount to USD using the provided rate
 * @param arsAmount - Amount in Argentine Pesos
 * @param usdRate - USD exchange rate at time of transaction
 * @returns number - Amount in USD, or null if rate is invalid
 */
export function convertToUsd(arsAmount: number, usdRate: number | undefined): number | null {
    if (!usdRate || usdRate <= 0) {
        return null;
    }
    return Math.round((arsAmount / usdRate) * 100) / 100;
}

/**
 * Format currency amount with proper symbol
 * @param amount - The amount to format
 * @param currency - 'ARS' or 'USD'
 * @returns Formatted string
 */
export function formatCurrency(amount: number, currency: 'ARS' | 'USD'): string {
    if (currency === 'USD') {
        return `US$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${amount.toLocaleString('es-AR')}`;
}

/**
 * Get the last update time from cache
 * @returns Date string or null if no cache
 */
export function getLastUpdateTime(): string | null {
    if (!cache) return null;
    return new Date(cache.timestamp).toLocaleString('es-AR');
}

/**
 * Force refresh the exchange rate (bypass cache)
 * @returns Promise<number> - The new USD Blue rate
 */
export async function refreshUsdRate(): Promise<number> {
    cache = null;
    return getUsdBlueRate();
}
