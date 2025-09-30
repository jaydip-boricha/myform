"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { sanitizeUserInput } from "@/ai/flows/sanitize-user-input";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

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
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FormSchema = z.object({
  content: z.string().min(1, {
    message: "Please enter some content.",
  }),
});

export default function Home() {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      content: "",
    },
  });

  async function onSubmit(values: z.infer<typeof FormSchema>) {
    setIsSaving(true);
    setIsSaved(false);

    try {
      const { sanitizedInput } = await sanitizeUserInput({
        userInput: values.content,
      });

      await addDoc(collection(db, "content"), {
        text: sanitizedInput,
        createdAt: new Date(),
      });

      form.reset({ content: "" });

      setIsSaved(true);
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

  return (
    <main className="flex min-h-full items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-md shadow-xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">FormFlow</CardTitle>
          <CardDescription>
            Enter your text, we'll sanitize and save it to the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  <span>Save Content</span>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
