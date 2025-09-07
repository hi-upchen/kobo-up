"use client";

// components/Footer.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KoboService } from '@/services/koboService';
import { NavigationService } from '@/services/navigationService';
import { pushToDataLayer } from '@/utils/gtm';
import { upload } from '@vercel/blob/client';
import { Button } from '@/components/button';
import { Text } from '@/components/text'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog';
import { getKoboDbFromLocal } from "@/models/KoboDB";
import Image from 'next/image';

const Footer = () => {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isUploadingOpen, setIsUploadingOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async () => {
    try {
      setIsConfirmOpen(false);
      setIsUploadingOpen(true);
      setUploadProgress(0);

      // Get the local database file
      const file = await getKoboDbFromLocal();
      if (!file) {
        throw new Error('No local database found');
      }

      // Generate a unique filename with timestamp
      const timestamp = new Date().getTime();
      const filename = `${timestamp}-kobodb-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // Upload with progress tracking
      const blob = await upload(filename, file, {
        access: 'public',
        handleUploadUrl: '/api/kobodb/upload',
        contentType: 'application/x-sqlite3',
        onUploadProgress: (progressEvent) => {
          setUploadProgress(Math.round(progressEvent.percentage));
        }
      });

      pushToDataLayer({
        event: 'share_debug_db',
        blob_url: blob.url
      });

      setTimeout(() => {
        setIsUploadingOpen(false);
        alert('Thank you for sharing! This will help improve the app.');
      }, 500);

    } catch (error) {
      console.error('Error uploading database:', error);
      setIsUploadingOpen(false);
      alert('Sorry, there was an error uploading the database.');
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleteConfirmOpen(false);
      pushToDataLayer({ event: 'clear_kobo_db' });
      await KoboService.clearStoredData();
      NavigationService.navigateToLanding(router, { reupload: true });
    } catch (error) {
      console.error('Failed to clear database:', error);
      setIsDeleteConfirmOpen(false);
      // Still navigate to landing even if cleanup fails
      NavigationService.navigateToLanding(router, { reupload: true });
    }
  };

  return (
    <>
      <footer className="footer flex justify-center items-center pt-4 px-2 py-2 border-t text-zinc-400 dark:text-zinc-500 text-sm border-zinc-900/10 dark:border-zinc-100/10 mt-6 sm:mt-12 lg:mt-24">
        <p className="mr-4 ml-auto hover:scale-105 transition">© 出走工程師 Up</p>



        <a href="mailto:hi.upchen@gmail.com" title="Send Email to Up Chen" className="mr-2 hover:text-zinc-950 dark:hover:text-zinc-50 transition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </a>

        <a
          href="https://www.runawayup.com/?utm_source=koboup&utm_content=footer"
          title="Visit 出走工程師阿普 Website"
          target="_blank"
          rel="noopener noreferrer"
          className="mr-2 hover:text-zinc-950 dark:hover:text-zinc-50 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        </a>

        <a
          href="https://github.com/upchen/kobo-up"
          title="KoboUp GitHub Repository"
          target="_blank"
          rel="noopener noreferrer"
          className="mr-2 hover:text-zinc-950 dark:hover:text-zinc-50 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.247c-5.518 0-10 4.481-10 10.013 0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-1.026-.013-1.862-2.782.602-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.607.069-.607 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678 1.003.678 2.022 0 1.462-.012 2.640-.012 3.001 0 .291.2.63.688.524C19.137 20.42 22 16.667 22 12.26c0-5.532-4.482-10.013-10-10.013Z"/>
          </svg>
        </a>

        <a
          href="https://www.facebook.com/runawayup"
          title="Visit 出走工程師阿普 Facebook"
          target="_blank"
          rel="noopener noreferrer"
          className="mr-2 hover:text-zinc-950 dark:hover:text-zinc-50 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2z" />
          </svg>
        </a>

        <a 
          href="https://www.buymeacoffee.com/hi.upchen" 
          target="_blank" 
          rel="noopener noreferrer"
          className="mr-4 hover:opacity-80 transition"
        >
          <Image 
            src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" 
            alt="Buy Me A Coffee" 
            width={217}
            height={60}
            className="h-[40px] w-auto"
          />
        </a>

        <p className="ml-auto hover:text-zinc-950 dark:hover:text-zinc-50 transition">
          <button
            type="button"
            title="Share KoboDB for debugging"
            onClick={() => setIsConfirmOpen(true)}
            className="mr-2 hover:text-zinc-950 dark:hover:text-zinc-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          </button>
        </p>

        <p className=" hover:text-zinc-950 dark:hover:text-zinc-50 transition">
          <button
            type="button"
            title="Clear Saved Kobo DB"
            onClick={() => setIsDeleteConfirmOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </p>
      </footer>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
        <DialogTitle>Share KoboDB</DialogTitle>
        <DialogDescription>
          Would you like to share your KoboDB with the developer to help improve the app?
          This will upload your database file for debugging purposes only.
        </DialogDescription>
        <DialogActions>
          <Button plain onClick={() => setIsConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} color="green">Share</Button>
        </DialogActions>
      </Dialog>

      {/* Upload Progress Dialog */}
      <Dialog open={isUploadingOpen} onClose={() => setIsUploadingOpen(false)}>
        <DialogTitle>Uploading Database</DialogTitle>
        <DialogBody>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <Text className="text-center mt-2">{uploadProgress}%</Text>
        </DialogBody>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)}>
        <DialogTitle>Clear Database</DialogTitle>
        <DialogDescription>
          Are you sure you want to clear the saved Kobo database? This action cannot be undone.
        </DialogDescription>
        <DialogActions>
          <Button plain onClick={() => setIsDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="red">Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Footer;