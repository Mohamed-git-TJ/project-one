'use client'

import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import PrivateNavbar from './private/privateNavbar/page'
import PublicNavbar from './public/publicNavbar/page'

export default function Home() {
  return (
    <>
      <Authenticated>
        <PrivateNavbar/>
        <Content/>
      </Authenticated>
      <Unauthenticated>
        <PublicNavbar/>
      </Unauthenticated>
    </>
  )
}

function Content() {
  const messages = useQuery(api.messages.getForCurrentUser)
  return <div>Authenticated content: {messages?.length}</div>
}   