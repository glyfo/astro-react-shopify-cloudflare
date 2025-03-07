// src/components/shopify/ProductSearch.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

const ProductSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  
  // Environment variables for Shopify connection
  const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || 'https://your-store.myshopify.com';
  const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN || 'your-storefront-api-token';

  // Initialize recent searches from localStorage
  useEffect(() => {
    try {
      const storedSearches = localStorage.getItem('recentProductSearches');
      if (storedSearches) {
        setRecentSearches(JSON.parse(storedSearches));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchQuery) => {
    try {
      // Don't save if query is too short
      if (searchQuery.length < 2) return;
      
      setRecentSearches(prev => {
        // Add to front, remove duplicates, limit to 5 items
        const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 5);
        localStorage.setItem('recentProductSearches', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error('Failed to save recent search:', e);
    }
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsResultsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    // Support keyboard navigation and accessibility
    const handleKeyDown = (event) => {
      // Close on escape
      if (event.key === 'Escape') {
        setIsResultsOpen(false);
        inputRef.current?.blur();
      }
      
      // Handle arrow keys for navigation
      if (isResultsOpen && resultsRef.current && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        const links = resultsRef.current.querySelectorAll('a');
        if (links.length === 0) return;
        
        // Find the currently focused element
        const focused = document.activeElement;
        const focusedIndex = Array.from(links).indexOf(focused);
        
        // Calculate new index
        let newIndex;
        if (event.key === 'ArrowDown') {
          newIndex = focusedIndex < 0 ? 0 : (focusedIndex + 1) % links.length;
        } else {
          newIndex = focusedIndex < 0 ? links.length - 1 : (focusedIndex - 1 + links.length) % links.length;
        }
        
        links[newIndex].focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isResultsOpen]);

  // Debounce search to prevent too many API calls
  useEffect(() => {
    let debounceTimer;
    
    if (query.length >= 2) {
      setIsSearching(true);
      setIsResultsOpen(true);
      
      debounceTimer = setTimeout(() => {
        performSearch(query);
      }, 300); // 300ms debounce
    } else {
      setResults([]);
      setIsResultsOpen(false);
    }
    
    return () => {
      clearTimeout(debounceTimer);
    };
  }, [query]);

  // Search products using Shopify Storefront API
  const performSearch = async (searchQuery) => {
    try {
      setError(null);
      const searchResults = await searchProducts(searchQuery);
      setResults(searchResults);
      
      // Save to recent searches if we got results
      if (searchResults.length > 0) {
        saveRecentSearch(searchQuery);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to search products. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const searchProducts = async (searchQuery) => {
    try {
      // Sanitize the search query for GraphQL
      const sanitizedQuery = searchQuery.replace(/"/g, '\\"');
      
      const response = await fetch(`${SHOPIFY_STORE_URL}/api/2023-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
        },
        body: JSON.stringify({
          query: `
            {
              products(first: 5, query: "${sanitizedQuery}") {
                edges {
                  node {
                    id
                    title
                    handle
                    priceRange {
                      minVariantPrice {
                        amount
                        currencyCode
                      }
                    }
                    featuredImage {
                      url
                      altText
                    }
                    availableForSale
                    tags
                  }
                }
              }
            }
          `
        })
      });
    
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const json = await response.json();
      
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }
      
      return json.data.products.edges.map(edge => ({
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle,
        price: `$${parseFloat(edge.node.priceRange.minVariantPrice.amount).toFixed(2)}`,
        currencyCode: edge.node.priceRange.minVariantPrice.currencyCode,
        image: edge.node.featuredImage?.url || '/placeholder-product.png',
        imageAlt: edge.node.featuredImage?.altText || edge.node.title,
        inStock: edge.node.availableForSale,
        isFeatured: edge.node.tags?.includes('featured') || false
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  };

  // Handle search input changes
  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };
  
  // Handle recent search click
  const handleRecentSearchClick = (searchTerm) => {
    setQuery(searchTerm);
    inputRef.current?.focus();
  };
  
  // Clear search input
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsResultsOpen(false);
    inputRef.current?.focus();
  };
  
  // Handle quick add to cart
  const handleQuickAddToCart = (e, product) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Prevent event bubbling
    
    // Create a custom event to add the product to cart
    const event = new CustomEvent('product:added-to-cart', {
      detail: {
        productId: product.id,
        productTitle: product.title,
        productPrice: parseFloat(product.price.replace('$', '')),
        productImage: product.image
      }
    });
    
    window.dispatchEvent(event);
    
    // Show confirmation
    const button = e.currentTarget;
    const originalText = button.innerText;
    
    button.innerText = 'Added!';
    button.classList.add('bg-green-600');
    button.classList.remove('bg-indigo-600');
    
    setTimeout(() => {
      button.innerText = originalText;
      button.classList.remove('bg-green-600');
      button.classList.add('bg-indigo-600');
    }, 1500);
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <label htmlFor="product-search" className="sr-only">Search products</label>
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <input
          id="product-search"
          ref={inputRef}
          type="text"
          placeholder="Search products..."
          className="w-full pl-10 pr-10 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setIsResultsOpen(true)}
          role="combobox"
          aria-expanded={isResultsOpen}
          aria-autocomplete="list"
          aria-controls="search-results"
        />
        {query && (
          <button 
            className="absolute inset-y-0 right-10 flex items-center pr-2"
            onClick={clearSearch}
            aria-label="Clear search"
          >
            <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {isSearching && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
      
      {/* Search Results Dropdown */}
      {isResultsOpen && (
        <div 
          id="search-results"
          ref={resultsRef}
          className="absolute mt-1 w-full bg-white rounded-lg shadow-lg z-20 overflow-hidden ring-1 ring-black ring-opacity-5"
          role="listbox"
        >
          {error ? (
            <div className="p-4 text-center text-red-500">
              <p>{error}</p>
              <button 
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                onClick={() => performSearch(query)}
              >
                Try again
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4">
              {query.length < 2 ? (
                <div className="text-center text-gray-500">
                  <p>Type at least 2 characters to search</p>
                  
                  {recentSearches.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">Recent searches</p>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term, index) => (
                          <button
                            key={index}
                            className="text-xs bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 text-gray-700"
                            onClick={() => handleRecentSearchClick(term)}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : isSearching ? (
                <div className="text-center text-gray-500">
                  Searching...
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>No products found for "{query}"</p>
                  <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-medium text-gray-500">{results.length} products found for "{query}"</p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {results.map((product, index) => (
                  <a 
                    key={product.id}
                    href={`/products/${product.handle}`}
                    className="block hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:bg-gray-50 focus:ring-1 focus:ring-inset focus:ring-indigo-500"
                    role="option"
                    aria-selected="false"
                    tabIndex="0"
                  >
                    <div className="p-3 flex items-center">
                      <div className="relative flex-shrink-0">
                        <img 
                          src={product.image} 
                          alt={product.imageAlt}
                          className="w-14 h-14 object-cover rounded-md shadow-sm"
                          onError={(e) => e.target.src = '/placeholder-product.png'}
                        />
                        {product.isFeatured && (
                          <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-800 text-xs font-bold px-1 py-0.5 rounded-md">
                            Featured
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{product.title}</h4>
                        <p className="text-sm font-semibold text-indigo-600 mt-1">{product.price}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-xs flex items-center ${product.inStock ? 'text-green-600' : 'text-red-500'}`}>
                            {product.inStock ? (
                              <>
                                <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                                </svg>
                                In stock
                              </>
                            ) : (
                              <>
                                <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                                </svg>
                                Out of stock
                              </>
                            )}
                          </span>
                          
                          {product.inStock && (
                            <button 
                              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded"
                              onClick={(e) => handleQuickAddToCart(e, product)}
                            >
                              Add to Cart
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                <a 
                  href={`/search?q=${encodeURIComponent(query)}`}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center justify-center"
                >
                  View all results
                  <svg className="h-3 w-3 ml-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 5l7 7-7 7"></path>
                  </svg>
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearch;