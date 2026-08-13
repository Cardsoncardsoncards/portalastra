'use client'

import { useEffect, useState } from 'react'
import styles from './AmazonProductRow.module.css'

interface Product {
  asin: string
  title: string
  author: string
  price: string
  image: string
  url: string
}

interface Props {
  heading: string
  searchQuery: string
  count?: number
}

export default function AmazonProductRow({ heading, searchQuery, count = 3 }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams({
      q: searchQuery,
      count: count.toString(),
    })

    fetch(`/api/amazon-books?${params}`)
      .then(r => r.json())
      .then(data => {
        setProducts(data.products ?? [])
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [searchQuery, count])

  // Nothing to show, render nothing so the page layout is unaffected
  if (!loading && products.length === 0) return null

  return (
    <section className={styles.section}>
      <h3 className={styles.heading}>{heading}</h3>

      <div className={styles.grid}>
        {loading
          ? Array.from({ length: count }).map((_, i) => (
              <div key={i} className={`${styles.card} ${styles.skeleton}`}>
                <div className={styles.skeletonImage} />
                <div className={styles.skeletonText} />
                <div className={styles.skeletonTextShort} />
                <div className={styles.skeletonPrice} />
              </div>
            ))
          : products.map(product => (
              <a
                key={product.asin}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.card}
                aria-label={`${product.title} on Amazon AU`}
              >
                <div className={styles.imageWrap}>
                  {product.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.title}
                      className={styles.image}
                      loading="lazy"
                    />
                  )}
                </div>
                <p className={styles.title}>{product.title}</p>
                {product.author && (
                  <p className={styles.author}>{product.author}</p>
                )}
                {product.price && (
                  <p className={styles.price}>{product.price}</p>
                )}
                <span className={styles.cta}>View on Amazon AU →</span>
              </a>
            ))}
      </div>

      <p className={styles.disclosure}>
        Portal Astra may earn a small commission on purchases made through these links at no extra cost to you.
      </p>
    </section>
  )
}
