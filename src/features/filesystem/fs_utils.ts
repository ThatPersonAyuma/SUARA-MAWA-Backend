import { fileType } from "elysia";
import { db } from "../../db/db_index";
import { files } from "../../db/schema";

type FileType = "image" | "video" | "document";

const imageExtensions = [
    "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"
];

const videoExtensions = [
    "mp4", "avi", "mov", "mkv", "webm", "flv", "wmv"
];

const documentExtensions = [
    "pdf", "doc", "docx", "xls", "xlsx",
    "ppt", "pptx", "txt", "csv"
];

function getFileType(extension: string): FileType | null {
    extension = extension.toLowerCase();

    if (imageExtensions.includes(extension)) return "image";
    if (videoExtensions.includes(extension)) return "video";
    if (documentExtensions.includes(extension)) return "document";

    return null;
}

export async function storeFile(file: any, filename: string | null, prefixPath: string){
    const extension = file.name.split('.').pop();
    if (filename==null){
        filename = file.name;
    }
    try{
        const bytesWritten = await Bun.write(`${prefixPath}/${filename}`, file);
        if (bytesWritten === file.size) {
            const fileType = getFileType(extension);
            if (fileType==null)return null;
            const res = await db.insert(files)
                .values({
                    name: filename!,
                    filetype: fileType
                }).returning({insertedFileId: files.id});
            if (res[0]==null){
                return null;
            }else{
                return res[0].insertedFileId;
            }
        } else {
            console.warn("Write may have been incomplete.");
            return null;
        }
    }catch(e){
        console.log(e);
        return null;
    }
}

export async function deleteFile(filename: string, prefixPath: string){
    const file = Bun.file(`${prefixPath}/${filename}`);
    if (await file.exists()) {
        await file.delete();
        return true;
    }else {
        return false;
    }
}

export async function getFile(filepath: string) {
    return Bun.file(filepath);
}