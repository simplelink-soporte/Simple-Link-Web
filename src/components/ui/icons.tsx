import {
  Check,
  Link,
  Unlink,
} from "lucide-react"
import { IconBuildingBank } from '@tabler/icons-react'

export const Icons = {
  check: Check,
  link: Link,
  unlink: Unlink,
  bank: IconBuildingBank,
  mercadoPago: (props: any) => (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.182c5.423 0 9.818 4.395 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818-5.423 0-9.818-4.395-9.818-9.818 0-5.423 4.395-9.818 9.818-9.818zm4.276 6.336h-1.905c-.21 0-.382.172-.382.382v6.546c0 .21.172.382.382.382h1.905c.21 0 .382-.172.382-.382V8.9c0-.21-.172-.382-.382-.382zm-6.647 0H7.724c-.21 0-.382.172-.382.382v6.546c0 .21.172.382.382.382h1.905c.21 0 .382-.172.382-.382V8.9c0-.21-.172-.382-.382-.382z"/>
    </svg>
  ),
} 