import Layout404A from '../layouts/Layout404A'
import Layout404B from '../layouts/Layout404B'
import Layout404C from '../layouts/Layout404C'

const layouts = [Layout404A, Layout404B, Layout404C]
const Layout = layouts[Math.floor(Math.random() * layouts.length)]

export default function NotFound() {
  return <Layout />
}
