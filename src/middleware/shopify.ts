// src/middleware/shopify.ts
import type { MiddlewareHandler } from 'astro';

// Configuration
const SHOPIFY_DOMAIN = "your-store.myshopify.com";
const SHOPIFY_ACCESS_TOKEN = "your-access-token";
const GRAPHQL_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/graphql`;

// Interfaces for Shopify types
interface ShopifyPrice {
  amount: string;
  currencyCode: string;
}

interface ShopifyImage {
  url: string;
  altText?: string;
}

interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  compareAtPrice: string | null;
  availableForSale: boolean;
  sku: string | null;
}

interface ShopifyGraphQLProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  availableForSale: boolean;
  priceRange: {
    minVariantPrice: ShopifyPrice;
  };
  compareAtPriceRange?: {
    minVariantPrice: ShopifyPrice;
  } | null;
  featuredImage: ShopifyImage | null;
  images: {
    edges: Array<{
      node: ShopifyImage;
    }>;
  };
  variants: {
    edges: Array<{
      node: ShopifyVariant;
    }>;
  };
}

// Our formatted product interface
interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  price: string;
  compareAtPrice?: string;
  image: string;
  images: string[];
  variants: Array<{
    id: string;
    title: string;
    price: string;
    compareAtPrice?: string;
    available: boolean;
    sku?: string;
  }>;
  available: boolean;
}

// GraphQL response interfaces
interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
  }>;
}

interface ProductByIdResponse {
  product: ShopifyGraphQLProduct | null;
}

// Define a type for the locals that will be used across the app
interface ShopifyLocals {
  shopify: {
    getProductById: (id: string) => Promise<ShopifyProduct>;
  };
}

// Extend AstroGlobal to include our locals
declare global {
  namespace App {
    interface Locals extends ShopifyLocals {}
  }
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request, locals } = context;
  const url = new URL(request.url);
  
  // Make Shopify client available in Astro components
  locals.shopify = {
    getProductById: (id: string) => fetchProductById(id)
  };
  
  // Only handle /api/shopify/products/:id route
  if (!url.pathname.match(/^\/api\/shopify\/products\/[^\/]+$/)) {
    return next();
  }
  
  // CORS headers
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  
  // Handle OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  
  // Only handle GET requests
  if (request.method !== 'GET') {
    return next();
  }
  
  try {
    // Get product ID from URL
    const productId = url.pathname.split('/').pop();
    
    if (!productId) {
      throw new Error('Product ID is required');
    }
    
    // Format the ID for GraphQL query (if needed)
    const formattedId = productId.includes('gid://') 
      ? productId 
      : `gid://shopify/Product/${productId}`;
    
    const product = await fetchProductById(formattedId);
    
    // Convert headers to a plain object correctly
    const headerObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headerObj[key] = value;
    });
    
    return new Response(JSON.stringify({ product }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...headerObj }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error: ${errorMessage}`);
    
    // Convert headers to a plain object correctly
    const headerObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headerObj[key] = value;
    });
    
    return new Response(JSON.stringify({
      status: 'error',
      message: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...headerObj }
    });
  }
};

/**
 * Execute a GraphQL query to Shopify with strong typing
 */
async function executeGraphQL<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`Shopify GraphQL error: ${response.status}`);
  }

  const result = await response.json() as GraphQLResponse<T>;
  
  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }
  
  if (!result.data) {
    throw new Error('No data returned from Shopify');
  }
  
  return result.data;
}

/**
 * Fetch a single product by ID with proper typing
 */
async function fetchProductById(id: string): Promise<ShopifyProduct> {
  // Use variables for GraphQL query to handle ID properly
  const query = `
    query GetProductById($id: ID!) {
      product(id: $id) {
        id
        title
        handle
        description
        availableForSale
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        featuredImage {
          url
          altText
        }
        images(first: 5) {
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
              price
              compareAtPrice
              availableForSale
              sku
            }
          }
        }
      }
    }
  `;
  
  const variables = { id };
  const data = await executeGraphQL<ProductByIdResponse>(query, variables);
  
  if (!data.product) {
    throw new Error(`Product not found: ${id}`);
  }
  
  return formatProduct(data.product);
}

/**
 * Format Shopify GraphQL product data with proper typing
 */
function formatProduct(product: ShopifyGraphQLProduct): ShopifyProduct {
  // Extract the numeric ID from the Shopify GraphQL ID
  const id = product.id.split('/').pop() || '';
  
  // Default empty image URL
  const defaultImage = '';
  
  // Get the featured image or the first image from the list
  const imageUrl = product.featuredImage?.url || 
                  (product.images.edges.length > 0 ? product.images.edges[0].node.url : defaultImage);
  
  // Map all image URLs
  const imageUrls = product.images.edges.map(({ node }) => node.url);
  
  // Format variants
  const variants = product.variants.edges.map(({ node }) => ({
    id: node.id.split('/').pop() || '',
    title: node.title,
    price: node.price,
    compareAtPrice: node.compareAtPrice || undefined,
    available: node.availableForSale,
    sku: node.sku || undefined
  }));
  
  return {
    id,
    title: product.title,
    handle: product.handle,
    description: product.description,
    price: product.priceRange.minVariantPrice.amount,
    compareAtPrice: product.compareAtPriceRange?.minVariantPrice?.amount,
    image: imageUrl,
    images: imageUrls,
    variants,
    available: product.availableForSale
  };
}