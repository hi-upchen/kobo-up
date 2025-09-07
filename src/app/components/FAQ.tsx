import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { MinusSmallIcon, PlusSmallIcon } from '@heroicons/react/24/outline'
import { Text } from '@/components/text'
import { Heading } from '@/components/heading'

const faqs = [
  {
    question: "How do I export Kobo highlights and notes?",
    answer:
      "1. Connect your Kobo device to your computer via USB. 2. Open this tool in Chrome, Edge, or Opera browser. 3. Select your Kobo device folder. 4. Our tool automatically finds your annotations database. 5. Browse books and export highlights to Markdown or TXT format.",
  },
  {
    question: "Can I export highlights from sideloaded Kobo books?",
    answer:
      "Yes! Unlike Kobo's built-in export feature that ignores sideloaded content, our tool extracts highlights and notes from ALL your books - including PDFs, EPUBs, and other formats you manually added to your device.",
  },
  {
    question: "What Kobo devices work with this export tool?",
    answer:
      "All Kobo e-readers that connect as a USB drive are supported, including: Kobo Clara, Kobo Libra, Kobo Forma, Kobo Sage, Kobo Elipsa, and older models. If your device appears as a removable drive when connected, it will work.",
  },
  {
    question: "Is my Kobo data safe when using this tool?",
    answer:
      "Yes, completely safe. All processing happens locally in your browser - your notes and highlights never leave your computer. No data is uploaded to external servers, ensuring complete privacy and security of your reading annotations.",
  },
  {
    question: "Which browsers support Kobo export functionality?",
    answer:
      "Chrome, Edge, and Opera browsers are supported. These browsers have the File System Access API needed to automatically detect your Kobo database. Safari and Firefox don't currently support this feature.",
  },
  {
    question: "Do I need to install software to export Kobo notes?",
    answer:
      "No installation required. This is a web-based tool that runs entirely in your browser. Simply connect your Kobo device, open the website, and start exporting - no downloads, installations, or technical setup needed.",
  },
  {
    question: "How does auto-detection of Kobo database work?",
    answer:
      "When you select your Kobo device folder, our tool automatically searches for the annotations database (typically named KoboReader.sqlite). This eliminates the need to manually locate hidden files or enable system settings to find your notes.",
  },
]

export default function FAQSection() {
  return (
      <div className="mx-auto px-0 py-6 sm:py-8 lg:py-10 mt-24 lg:mt-36">
        <div className="mx-auto divide-y divide-gray-800/10 dark:divide-gray-100/10">
          <Heading className="text-center">
            Kobo Export Questions & Solutions
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
