import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from '../page.module.css'

export const metadata: Metadata = {
  title: 'Our Data Sources | Portal Astra',
  description:
    'Every number on Portal Astra comes from a real NASA Open API. Here is exactly where each piece of data comes from.',
}

const SOURCES = [
  {
    name: 'NASA APOD (Astronomy Picture of the Day)',
    endpoint: 'api.nasa.gov/planetary/apod',
    text: 'Updated daily at midnight UTC. The image and explanation on our Space tab come directly from this feed.',
  },
  {
    name: 'NASA DONKI (Space Weather)',
    endpoint: 'kauai.ccmc.gsfc.nasa.gov/DONKI',
    text: 'Solar flare and geomagnetic storm data powering our Solar tab. Updated in near real time.',
  },
  {
    name: 'NASA EPIC (Earth Imagery)',
    endpoint: 'api.nasa.gov/EPIC',
    text: 'Full disc Earth images taken by the DSCOVR spacecraft at the L1 Lagrange point, 1.5 million km away.',
  },
  {
    name: 'NASA NeoWs (Near Earth Objects)',
    endpoint: 'api.nasa.gov/neo/rest/v1',
    text: 'Asteroid close approach data. Updated daily from JPL Horizons.',
  },
]

export default function NasaDataPage() {
  return (
    <main className={styles.main}>
      <div className={styles.stars} aria-hidden />

      <div className={styles.container}>
        <Navbar />
        <h1 className={styles.pageTitle}>Our Data Sources</h1>
        <p className={styles.blogIntro}>
          Every number on Portal Astra comes from a real API. Here is exactly where.
        </p>

        <div className={styles.panel}>
          {SOURCES.map((s) => (
            <div key={s.name} className={styles.card}>
              <h2 className={styles.legalH} style={{ marginTop: 0 }}>{s.name}</h2>
              <p className={styles.label} style={{ color: '#C9A84C', textTransform: 'none', letterSpacing: '0.02em' }}>
                {s.endpoint}
              </p>
              <p className={styles.infoText}>{s.text}</p>
            </div>
          ))}
        </div>

        <p className={styles.infoText} style={{ marginTop: '1.5rem' }}>
          Portal Astra uses the NASA Open APIs under the Creative Commons licence. Data is provided as-is
          for educational and informational purposes.
        </p>

      </div>
      <Footer title="Portal Astra" />
    </main>
  )
}
