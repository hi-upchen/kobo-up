import { HeroHeading, Heading, Subheading } from '@/components/heading'
import { Strong, Text } from '@/components/text'
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid'

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <HeroHeading className="text-center">KoboUp Library</HeroHeading>
      <Text className="mt-6">
        <ExclamationTriangleIcon className="h-12 w-12 mx-auto" />
      </Text>
      <Text className="mt-4">
        Please use <Strong>Chrome</Strong> or <Strong>Edge</Strong> browser as this page uses the File System Access API which is not supported in your current browser.
      </Text>
    </div>
  )
}
