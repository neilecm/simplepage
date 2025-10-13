import { createClient } from "@supabase/supabase-js";
import parser from "lambda-multipart-parser";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return errorResponse(405, "Method not allowed");
    }

    const result = await parser.parse(event);
    const file = (result.files || [])[0];
    if (!file) {
      return errorResponse(400, "No file uploaded");
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const safeName = file.filename.replace(/\s+/g, "_");
    const uploadPath = `products/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("product_media")
      .upload(uploadPath, file.content, {
        upsert: true,
        contentType: file.contentType || "application/octet-stream",
      });

    if (uploadError) {
      console.error("[UPLOAD ERROR]", uploadError);
      return errorResponse(
        uploadError.status || 500,
        uploadError.message,
        uploadError.details || null
      );
    }

    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/product_media/${uploadPath}`;
    console.log("[UPLOAD PATHS]", {
      write: `product_media/${uploadPath}`,
      read: `/storage/v1/object/public/product_media/${uploadPath}`,
    });

    console.log("[upload-media] Success:", { uploadPath });
    return successResponse("File uploaded successfully", { publicUrl });
  } catch (err) {
    console.error("[UPLOAD EXCEPTION]", err);
    return errorResponse(err?.status || 500, err?.message || "Upload failed", err?.details || null);
  }
};

const successResponse = (message, data) => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, data }),
});

const errorResponse = (status, message, details = null) => ({
  statusCode: status || 500,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: message || "Unexpected server error",
    details,
  }),
});
