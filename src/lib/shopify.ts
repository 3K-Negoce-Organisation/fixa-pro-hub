// Shopify Storefront API Configuration
const SHOPIFY_DOMAIN = 'vis-a-bois.myshopify.com';
const SHOPIFY_STOREFRONT_TOKEN = '963dcf61d7dc537a271006434e5fd47b';

const STOREFRONT_API_URL = `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`;

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    edges: Array<{
      node: {
        url: string;
        altText: string | null;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: {
          amount: string;
          currencyCode: string;
        };
        availableForSale: boolean;
        quantityAvailable: number;
      };
    }>;
  };
  tags: string[];
  productType: string;
}

export interface ProductFilters {
  diameter?: string[];
  length?: string[];
  driveType?: string[];
  material?: string[];
  headType?: string[];
}

export async function shopifyFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  console.log('🔗 Shopify API Call:', { 
    url: STOREFRONT_API_URL, 
    domain: SHOPIFY_DOMAIN,
    tokenPresent: !!SHOPIFY_STOREFRONT_TOKEN,
    variables 
  });

  if (!SHOPIFY_DOMAIN || !SHOPIFY_STOREFRONT_TOKEN) {
    console.warn('Shopify credentials not configured. Using mock data.');
    throw new Error('Shopify not configured');
  }

  try {
    const response = await fetch(STOREFRONT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    console.log('📡 Shopify Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Shopify API Error:', errorText);
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const json = await response.json();
    console.log('✅ Shopify Data:', json);
    
    if (json.errors) {
      console.error('❌ GraphQL Errors:', json.errors);
      throw new Error(json.errors[0].message);
    }

    const productCount = json.data?.products?.edges?.length || 0;
    console.log(`📦 Products fetched: ${productCount}`);
    if (productCount > 0) {
      console.log('📝 Product titles:', json.data.products.edges.map((e: any) => e.node.title));
    }

    return json.data;
  } catch (error) {
    console.error('🚨 Shopify Fetch Error:', error);
    throw error;
  }
}

// GraphQL Queries
export const PRODUCTS_QUERY = `
  query getProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          description
          productType
          tags
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                quantityAvailable
              }
            }
          }
        }
      }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `
  query getProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      productType
      tags
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 5) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 20) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            quantityAvailable
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

// Price formatting utilities for B2B (HT/TTC)
const TVA_RATE = 0.20; // 20% TVA

export function formatPriceHT(amount: string | number): string {
  const price = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

export function formatPriceTTC(amountHT: string | number): string {
  const priceHT = typeof amountHT === 'string' ? parseFloat(amountHT) : amountHT;
  const priceTTC = priceHT * (1 + TVA_RATE);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(priceTTC);
}

export function calculateTTC(amountHT: string | number): number {
  const priceHT = typeof amountHT === 'string' ? parseFloat(amountHT) : amountHT;
  return priceHT * (1 + TVA_RATE);
}
