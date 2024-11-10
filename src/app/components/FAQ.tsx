import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { MinusSmallIcon, PlusSmallIcon } from '@heroicons/react/24/outline'
import { Text } from '@/components/text'
import { Heading } from '@/components/heading'

const faqs = [
  {
    question: "What Kobo devices are supported?",
    answer:
      "If your Kobo e-reader connects to your computer as a disk (usually seen as a drive on your desktop or in the file explorer), you can use this tool to access and export your notes.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Absolutely. Your data stays entirely on your computer; the website doesn’t upload anything to external servers, so your notes and annotations remain private and secure.",
  },
  {
    question: "Do I need an account?",
    answer:
      "No account is needed. Just connect your Kobo device and start exporting your notes right away.",
  },
  {
    question: "Which browsers are supported?",
    answer:
      "Our website utilizes modern technology to locate your Kobo database automatically. As a result, it is currently compatible only with Chrome, Edge, and Opera browsers. Safari and Firefox are not supported at this time.",
  },
  {
    question: "Can I use the app on mobile?",
    answer:
      "Since you need to connect your Kobo device to a computer for it to be recognized as a drive, a laptop or desktop computer is required to use this tool.",
  },
  {
    question: "Does this tool require additional software or programming knowledge?",
    answer:
      "No extra software, installations, or programming knowledge are needed. The tool is designed to handle everything seamlessly in your browser, making it easy for anyone to use.",
  },
  {
    question: "How does this tool locate my notes and annotations?",
    answer:
      "Once you select the root folder of your connected Kobo device, our tool automatically searches for the necessary files, sparing you from having to enable hidden files or manually find the database.",
  },
]

export default function FAQSection() {
  return (
      <div className="mx-auto px-0 py-6 sm:py-8 lg:py-10 mt-24 lg:mt-36">
        <div className="mx-auto divide-y divide-gray-800/10 dark:divide-gray-100/10">
          <Heading className="text-4xl font-semibold tracking-tight sm:text-5xl text-center">
            Frequently asked questions
          </Heading>
          <dl className="mt-10 space-y-6 divide-y divide-gray-800/10 dark:divide-gray-100/10">
            {faqs.map((faq) => (
              <Disclosure key={faq.question} as="div" className="pt-6">
                <dt>
                  <DisclosureButton className="group flex w-full items-start justify-between text-left ">
                    <Text className="text-base/7 font-semibold">{faq.question}</Text>
                    <Text className="ml-6 flex h-7 items-center">
                      <PlusSmallIcon aria-hidden="true" className="h-6 w-6 group-data-[open]:hidden" />
                      <MinusSmallIcon aria-hidden="true" className="h-6 w-6 [.group:not([data-open])_&]:hidden" />
                    </Text>
                  </DisclosureButton>
                </dt>
                <DisclosurePanel as="dd" className="mt-2 pr-12">
                  <Text className="text-base/7">{faq.answer}</Text>
                </DisclosurePanel>
              </Disclosure>
            ))}
          </dl>
        </div>
      </div>
  )
}
