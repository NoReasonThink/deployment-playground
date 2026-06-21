import {
  Activity,
  Archive,
  Boxes,
  Cloud,
  Database,
  Eye,
  Fingerprint,
  Gauge,
  GitBranch,
  Globe,
  Layers,
  Network,
  Radar,
  Router,
  Search,
  Server,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import type { NodeKind } from '../types'

export interface ComponentIconMeta {
  Icon: LucideIcon
  label: string
  tone: string
}

export const componentIconMeta: Record<NodeKind, ComponentIconMeta> = {
  cdn: { Icon: Globe, label: 'CDN', tone: 'cyan' },
  'load-balancer': { Icon: Router, label: 'Load Balancer', tone: 'blue' },
  'api-gateway': { Icon: Network, label: 'API Gateway', tone: 'indigo' },
  waf: { Icon: Shield, label: 'WAF', tone: 'red' },
  'rate-limiter': { Icon: Gauge, label: 'Rate Limiter', tone: 'amber' },
  'circuit-breaker': { Icon: GitBranch, label: 'Circuit Breaker', tone: 'orange' },
  'service-mesh': { Icon: Boxes, label: 'Service Mesh', tone: 'violet' },
  observability: { Icon: Activity, label: 'Observability', tone: 'emerald' },
  tracing: { Icon: Radar, label: 'Tracing', tone: 'teal' },
  iam: { Icon: Fingerprint, label: 'IAM', tone: 'slate' },
  'object-storage': { Icon: Archive, label: 'Object Storage', tone: 'lime' },
  web: { Icon: Cloud, label: 'Web Service', tone: 'sky' },
  service: { Icon: Server, label: 'Microservice', tone: 'purple' },
  redis: { Icon: Layers, label: 'Redis', tone: 'rose' },
  mq: { Icon: Eye, label: 'Kafka MQ', tone: 'zinc' },
  database: { Icon: Database, label: 'Database', tone: 'green' },
  search: { Icon: Search, label: 'Elasticsearch', tone: 'yellow' },
}
