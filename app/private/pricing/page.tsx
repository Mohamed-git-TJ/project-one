import { PricingTable } from '@clerk/nextjs'
import PrivateNavbar from '../privateNavbar/page'

export default function PricingPage() {
  return (
    <><PrivateNavbar />
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
      <PricingTable />
    </div>
    </>
  )
}