"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { sanitizeUserInput } from "@/ai/flows/sanitize-user-input";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const FormSchema = z.object({
  content: z.string().min(1, {
    message: "Please enter some content.",
  }),
  image: z.any().optional(),
});

interface ContentItem {
  id: string;
  text: string;
  imageUrl?: string;
  createdAt: Timestamp;
}

export default function Home() {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      content: "",
      image: undefined,
    },
  });

  useEffect(() => {
    const q = query(collection(db, "content"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const items: ContentItem[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as ContentItem);
        });
        setContentList(items);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching content:", error);
        toast({
          variant: "destructive",
          title: "An Error Occurred",
          description: "Could not fetch content from the database.",
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  async function onSubmit(values: z.infer<typeof FormSchema>) {
    setIsSaving(true);
    setIsSaved(false);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error("Cloudinary credentials are not set in .env file.");
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Cloudinary is not configured. Please check your environment variables.",
      });
      setIsSaving(false);
      return;
    }

    try {
      const { sanitizedInput } = await sanitizeUserInput({
        userInput: values.content,
      });

      let imageUrl: string | undefined = undefined;
      const file = values.image?.[0];

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Image upload failed');
        }

        const data = await response.json();
        imageUrl = data.secure_url;
      }

      const dataToSave: {
        text: string;
        createdAt: Date;
        imageUrl?: string;
      } = {
        text: sanitizedInput,
        createdAt: new Date(),
      };

      if (imageUrl) {
        dataToSave.imageUrl = imageUrl;
      }

      await addDoc(collection(db, "content"), dataToSave);

      form.reset();
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
      setIsSaved(true);
      toast({
        title: "Success!",
        description: "Your content has been saved successfully.",
      });
      setTimeout(() => setIsSaved(false), 2500);
    } catch (error) {
      console.error("Error saving content:", error);
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description:
          "There was a problem saving your content. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item: ContentItem) {
    try {
      // Note: This only deletes the database record, not the image from Cloudinary.
      // Deleting from Cloudinary requires a secure backend call.
      await deleteDoc(doc(db, "content", item.id));
      toast({
        title: "Deleted!",
        description: "The content has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting content:", error);
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description:
          "There was a problem deleting your content. Please try again.",
      });
    }
  }

  function handleEdit(item: ContentItem) {
    setEditingId(item.id);
    setEditingText(item.text);
  }

  async function handleUpdate(id: string) {
    if (editingText.trim() === "") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Content cannot be empty.",
      });
      return;
    }
    setIsUpdating(true);
    try {
      const { sanitizedInput } = await sanitizeUserInput({
        userInput: editingText,
      });
      const docRef = doc(db, "content", id);
      await updateDoc(docRef, { text: sanitizedInput });

      setEditingId(null);
      setEditingText("");
      toast({
        title: "Updated!",
        description: "The content has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating content:", error);
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description:
          "There was a problem updating your content. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <main className="flex min-h-full items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl space-y-8">
        <Card className="w-full shadow-xl rounded-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline">FormFlow</CardTitle>
            <CardDescription>
              Enter your text, we'll sanitize and save it to the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Your Content</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="What's on your mind?"
                          {...field}
                          className="h-12 text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          className="file:text-primary"
                          ref={imageInputRef}
                          onChange={(e) => field.onChange(e.target.files)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary transition-all duration-300 ease-in-out"
                  disabled={isSaving || isSaved}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : isSaved ? (
                    <>
                      <Check />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                    <Upload />
                    <span>Save Content</span>
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-headline text-center">Saved Content</h2>
          <Separator />
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : contentList.length > 0 ? (
            <div className="space-y-4">
              {contentList.map((item) => (
                <Card
                  key={item.id}
                  className="flex items-start gap-4 p-4"
                >
                  {item.imageUrl && (
                     <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
                        <Image
                            src={item.imageUrl}
                            alt="Uploaded content"
                            fill
                            className="rounded-md object-cover"
                        />
                     </div>
                  )}
                  <div className="flex-1 flex flex-col h-full">
                  {editingId === item.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="h-9"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(item.id)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="flex-1 pr-4 break-words mb-2">{item.text}</p>
                      <div className="flex items-center mt-auto">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          aria-label="Edit content"
                        >
                          <Pencil className="h-5 w-5 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item)}
                          aria-label="Delete content"
                        >
                          <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No content saved yet.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

    