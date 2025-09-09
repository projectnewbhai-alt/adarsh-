const FOLDER_NAME = "AmanJewellers_Documents";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

let folderIdCache: string | null = null;

async function getAppFolderId(accessToken: string): Promise<string> {
    if (folderIdCache) return folderIdCache;

    const query = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME_TYPE}' and trashed=false`);
    const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!searchResponse.ok) throw new Error('Failed to search for folder.');
    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
        folderIdCache = searchData.files[0].id;
        return folderIdCache!;
    }

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: FOLDER_NAME,
            mimeType: FOLDER_MIME_TYPE
        })
    });
    if (!createResponse.ok) throw new Error('Failed to create folder.');
    const createData = await createResponse.json();
    
    if (createData.id) {
        folderIdCache = createData.id;
        return folderIdCache!;
    }

    throw new Error('Could not find or create Google Drive folder.');
}

export async function uploadPdfToDrive(accessToken: string, pdfBlob: Blob, fileName: string): Promise<any> {
    const folderId = await getAppFolderId(accessToken);
    
    const metadata = {
        name: fileName,
        mimeType: 'application/pdf',
        parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', pdfBlob);

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form
    });
    
    if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(`Google Drive upload failed: ${errorData.error.message}`);
    }

    return await uploadResponse.json();
}