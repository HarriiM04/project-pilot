import type { ChatMessage, DiscoveryState } from './types'

export const initialMessages: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    content:
      "Hi, I'm Pilot — your AI pre-sales engineer. Tell me about the software you have in mind and I'll turn our conversation into structured requirements, user stories, and an architecture plan. What are we building?",
    createdAt: Date.now() - 1000 * 60 * 12,
  },
  {
    id: 'm2',
    role: 'user',
    content:
      "We want to build a fast-food delivery app. Customers order from nearby restaurants, track the driver in real time, and pay in-app. Think of a lighter, faster version of the big delivery platforms.",
    createdAt: Date.now() - 1000 * 60 * 11,
  },
  {
    id: 'm3',
    role: 'assistant',
    content:
      "Great — a fast-food delivery marketplace with real-time tracking and in-app payments. I've captured the core objective. A few things to sharpen the scope: will you launch with a single city, and do restaurants manage their own menus, or does your team onboard them?",
    createdAt: Date.now() - 1000 * 60 * 10,
  },
  {
    id: 'm4',
    role: 'user',
    content:
      'Single city at launch. Restaurants should manage their own menus and hours through a partner dashboard. We also need a driver app for accepting and delivering orders.',
    createdAt: Date.now() - 1000 * 60 * 9,
  },
  {
    id: 'm5',
    role: 'assistant',
    content:
      "Understood. That gives us three surfaces: a customer app, a restaurant partner dashboard, and a driver app. I've logged the feature list and started drafting the BRD and PRD on the right. Next I'd like to confirm your target order-to-doorstep time and whether you need scheduled orders in v1.",
    createdAt: Date.now() - 1000 * 60 * 8,
  },
]

export const initialDiscovery: DiscoveryState = {
  projectName: 'QuickBite Delivery',
  clientName: 'Northwind Foods',
  domain: 'Food Delivery Marketplace',
  overallCompletion: 68,
  sections: [
    { key: 'goals', label: 'Business Goals', completion: 90 },
    { key: 'requirements', label: 'Requirement Gap Analysis', completion: 70 },
    { key: 'users', label: 'User & Persona Mapping', completion: 75 },
    { key: 'scope', label: 'Scope Definition', completion: 60 },
    { key: 'nfr', label: 'Non-Functional Reqs', completion: 45 },
    { key: 'arch', label: 'Architecture Fit', completion: 55 },
  ],
  features: [
    {
      id: 'f1',
      name: 'Restaurant discovery & search',
      description:
        'Browse nearby restaurants with filters for cuisine, price, rating, and delivery time.',
      priority: 'must-have',
      effort: 'M',
      status: 'captured',
    },
    {
      id: 'f2',
      name: 'Cart & in-app checkout',
      description: 'Add items, apply promos, and pay with saved cards or wallets.',
      priority: 'must-have',
      effort: 'L',
      status: 'captured',
    },
    {
      id: 'f3',
      name: 'Real-time driver tracking',
      description: 'Live map of driver location with ETA updates and push notifications.',
      priority: 'must-have',
      effort: 'XL',
      status: 'captured',
    },
    {
      id: 'f4',
      name: 'Restaurant partner dashboard',
      description: 'Menu, hours, pricing, and order management for partner restaurants.',
      priority: 'must-have',
      effort: 'L',
      status: 'clarifying',
    },
    {
      id: 'f5',
      name: 'Driver order app',
      description: 'Accept, batch, and complete deliveries with turn-by-turn navigation.',
      priority: 'should-have',
      effort: 'L',
      status: 'captured',
    },
    {
      id: 'f6',
      name: 'Ratings & reviews',
      description: 'Post-delivery ratings for restaurants and drivers.',
      priority: 'should-have',
      effort: 'S',
      status: 'proposed',
    },
    {
      id: 'f7',
      name: 'Scheduled orders',
      description: 'Let customers place orders for a future delivery window.',
      priority: 'nice-to-have',
      effort: 'M',
      status: 'proposed',
    },
  ],
  brd: {
    objectives: [
      'Launch a single-city fast-food delivery marketplace within two quarters.',
      'Reach a median order-to-doorstep time under 30 minutes.',
      'Onboard 120 partner restaurants before public launch.',
    ],
    scope: [
      'Customer mobile app (iOS & Android) with discovery, checkout, and tracking.',
      'Restaurant partner web dashboard for menu and order management.',
      'Driver mobile app for delivery fulfillment.',
    ],
    stakeholders: [
      'Product Sponsor — VP of Digital, Northwind Foods',
      'Operations Lead — city launch & driver logistics',
      'Restaurant Partnerships — onboarding & support',
    ],
  },
  prd: {
    personas: [
      'Hungry Customer — wants food fast with reliable ETAs.',
      'Restaurant Manager — needs simple menu and order control.',
      'Delivery Driver — wants clear routes and steady earnings.',
    ],
    goals: [
      'Reduce checkout to under three taps for returning customers.',
      'Surface accurate delivery ETAs on every order.',
      'Give partners self-serve menu editing with instant publish.',
    ],
    metrics: [
      'Order completion rate ≥ 96%',
      'Median delivery time ≤ 30 min',
      'Partner menu update latency < 60s',
    ],
  },
  srs: {
    functional: [
      {
        id: 'fr1',
        code: 'FR-01',
        requirement: 'System shall list restaurants within a configurable delivery radius.',
        category: 'Discovery',
      },
      {
        id: 'fr2',
        code: 'FR-02',
        requirement: 'System shall process in-app payments via a PCI-compliant gateway.',
        category: 'Payments',
      },
      {
        id: 'fr3',
        code: 'FR-03',
        requirement: "System shall stream driver GPS location to the customer every 5 seconds.",
        category: 'Tracking',
      },
      {
        id: 'fr4',
        code: 'FR-04',
        requirement: 'Partners shall create and publish menu changes without redeployment.',
        category: 'Partner',
      },
    ],
    nonFunctional: [
      {
        id: 'nfr1',
        code: 'NFR-01',
        requirement: 'Order APIs shall respond within 300ms at the 95th percentile.',
        category: 'Performance',
      },
      {
        id: 'nfr2',
        code: 'NFR-02',
        requirement: 'Platform shall sustain 10k concurrent tracking sessions.',
        category: 'Scalability',
      },
      {
        id: 'nfr3',
        code: 'NFR-03',
        requirement: 'All PII shall be encrypted at rest and in transit.',
        category: 'Security',
      },
    ],
  },
  userStories: [
    {
      id: 'us1',
      persona: 'Customer',
      want: 'to track my driver on a live map',
      soThat: 'I know exactly when my food will arrive',
      points: 8,
    },
    {
      id: 'us2',
      persona: 'Customer',
      want: 'to save my payment method',
      soThat: 'I can check out in a couple of taps',
      points: 3,
    },
    {
      id: 'us3',
      persona: 'Restaurant Manager',
      want: 'to pause ordering when we are slammed',
      soThat: 'we do not accept orders we cannot fulfill',
      points: 5,
    },
    {
      id: 'us4',
      persona: 'Driver',
      want: 'to see optimized delivery routes',
      soThat: 'I can complete more deliveries per hour',
      points: 8,
    },
  ],
  architecture: {
    layers: [
      { name: 'Client', tech: 'React Native + Next.js', note: 'Customer, partner, and driver surfaces' },
      { name: 'API Gateway', tech: 'Node.js / tRPC', note: 'Auth, rate limiting, routing' },
      { name: 'Realtime', tech: 'WebSockets + Redis', note: 'Driver location & order status' },
      { name: 'Data', tech: 'PostgreSQL + PostGIS', note: 'Orders, menus, geo queries' },
      { name: 'Payments', tech: 'Stripe Connect', note: 'Split payouts to partners & drivers' },
    ],
    integrations: ['Mapbox', 'Stripe', 'Twilio', 'Segment'],
  },
}
