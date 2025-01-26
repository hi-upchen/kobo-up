import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
 
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        console.log('Upload attempted with pathname:', pathname);
        // Generate a client token for the browser to upload the file
        // ⚠️ Authenticate and authorize users before generating the token.
        // Otherwise, you're allowing anonymous uploads.
 
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/png', 'application/x-sqlite3'],
          tokenPayload: JSON.stringify({
            // optional, sent to your server on upload completion
            // you could pass a user id from auth, or a value from clientPayload
          }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Get notified of client upload completion
        // ⚠️ This will not work on `localhost` websites,
        // Use ngrok or similar to get the full upload flow
  
        try {
          const formData = new FormData();
          formData.append('from', `Kobo DB Upload <postmaster@${process.env.MAILGUN_SENDING_DOMAIN}>`);
          formData.append('to', process.env.INTERNAL_NOTIFICATION_EMAIL!);
          formData.append('subject', 'New Kobo DB Upload');
          formData.append('text', `A new Kobo DB was uploaded:\n\nURL: ${blob.url}\nTimestamp: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' })}`);

          const auth = Buffer.from(`api:${process.env.MAILGUN_SENDING_API_KEY}`).toString('base64');
          
          const response = await fetch(
            `https://api.mailgun.net/v3/${process.env.MAILGUN_SENDING_DOMAIN}/messages`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${auth}`,
              },
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error(`Mailgun API error: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.error('Failed to send notification:', error);
          // Don't throw here to avoid affecting the upload response
        }
      },
    });
 
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }, // The webhook will retry 5 times waiting for a 200
    );
  }
}