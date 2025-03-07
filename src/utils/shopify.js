// utils/shopify.js
// Simple utility to fetch Shopify products through the Storefront API

/**
 * Fetch products from Shopify Storefront API
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of products to fetch
 * @param {boolean} options.featured - Whether to fetch only featured products
 * @returns {Promise<Array>} Array of product objects
 */
export async function getShopifyProducts({ limit = 10, featured = false } = {}) {
  // Get Shopify credentials from environment variables
  const SHOPIFY_STORE_DOMAIN = import.meta.env.SHOPIFY_STORE_DOMAIN;
  const SHOPIFY_STOREFRONT_ACCESS_TOKEN = import.meta.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    console.error('Missing Shopify credentials in environment variables');
    return [];
  }
  
  try {
    // Construct the GraphQL query
    const query = `
      query Products($limit: Int!, $isFeatured: Boolean) {
        products(first: $limit, query: $isFeatured ? "tag:featured" : "") {
          edges {
            node {
              id
              title
              handle
              description
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `;

    // Make the request to Shopify Storefront API
    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/api/2023-07/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          query,
          variables: {
            limit,
            isFeatured: featured,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Error fetching Shopify products: ${response.statusText}`);
    }

    const { data } = await response.json();
    
    // Transform the response into a simpler format
    return data.products.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      description: node.description,
      images: node.images.edges.map(({ node: imageNode }) => ({
        url: imageNode.url,
        altText: imageNode.altText,
      })),
      priceRange: {
        minVariantPrice: node.priceRange.minVariantPrice,
      },
    }));
  } catch (error) {
    console.error('Failed to fetch products from Shopify:', error);
    return [];
  }
}