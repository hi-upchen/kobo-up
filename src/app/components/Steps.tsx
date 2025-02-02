import React from 'react';
import { useState, useEffect } from 'react';
import { Strong, Text } from '@/components/text'
import { Heading } from '@/components/heading'

export default function StepsSection() {
  const [isDirectoryPickerSupported, setIsDirectoryPickerSupported] = useState(true);

  useEffect(() => {
    setIsDirectoryPickerSupported('showDirectoryPicker' in window);
  }, []);

  return (
    <div className="mx-auto px-0 py-6 sm:py-8 lg:py-10 mt-24 lg:mt-36">
      <Heading className="text-4xl font-semibold tracking-tight sm:text-5xl text-center">
        Try it Out Now
      </Heading>

      <div className="mt-8">
        {isDirectoryPickerSupported && (
          <ol className="mt-4 list-decimal list-inside space-y-2">
            <li className="text-zinc-800 dark:text-zinc-300">
              <Text className="inline"><Strong>Connect:</Strong> Connect your Kobo device.</Text>
            </li>
            <li className="text-zinc-800 dark:text-zinc-300">
              <Text className="inline"><Strong>Select:</Strong> Select the <Strong>Kobo Root folder</Strong>.</Text>
            </li>
            <li className="text-zinc-800 dark:text-zinc-300">
              <Text className="inline"><Strong>View:</Strong> View your notes and annotations books by books.</Text>
            </li>
          </ol>
        )}
        {!isDirectoryPickerSupported && (
          <div className='mt-12 sm:mt-18 '>
            <Text className="text-center">

              <div className=''>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-24 w-24 mx-auto text-orange-700 dark:text-orange-300 my-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
            </Text>
            <Text className='text-center'>
              <div className='text-orange-700 dark:text-orange-300'><strong>Your browser is not supported.</strong></div>
              <div className="text-orange-700 dark:text-orange-300 mt-2">Please use <Strong>Chrome</Strong> or <Strong>Edge</Strong> browser.</div>
            </Text>
          </div>
        )}
      </div>

    </div >
  );
};