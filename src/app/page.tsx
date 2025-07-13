"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppHeader } from "@/components/app-header";
import { useToast } from "@/hooks/use-toast";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2, ListPlus, Mic } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ---------------------
// Fix missing SpeechRecognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
type SpeechRecognition = any;
type SpeechRecognitionEvent = any;
// ---------------------


const grocerySchema = z.object({
  items: z.string().min(1, "Please enter at least one grocery item.").max(1000, "Input is too long."),
});
type GroceryFormValues = z.infer<typeof grocerySchema>;

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  const form = useForm<GroceryFormValues>({
    resolver: zodResolver(grocerySchema),
    defaultValues: {
      items: "",
    },
  });

  // Load items from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT);
    if (saved) form.setValue("items", saved);
  }, [form]);

  // Save to localStorage on change
  useEffect(() => {
    const sub = form.watch((value) => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT, value.items || "");
    });
    return () => sub.unsubscribe();
  }, [form]);

  // Setup speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.replace(/\.$/, "");
        const currentItems = form.getValues("items");
        const newItems = currentItems ? `${currentItems}, ${transcript}` : transcript;
        form.setValue("items", newItems, { shouldValidate: true });

        toast({
          title: "Voice Input Captured",
          description: `"${transcript}" added to your list.`,
        });
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        toast({
          variant: "destructive",
          title: "Voice Error",
          description: `Could not start voice recognition: ${event.error}`,
        });
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [form, toast]);

  const handleMicClick = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Could not start recognition", error);
        toast({
          variant: "destructive",
          title: "Voice Error",
          description: "Could not start voice recognition. Please try again.",
        });
      }
    }
  };

  const handleSubmit: SubmitHandler<GroceryFormValues> = async (data) => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT, data.items);
    router.push("/plan");
  };

  const handleClear = () => {
    form.reset({ items: "" });
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_ADDED_SUGGESTIONS);

    toast({
      title: "List Cleared",
      description: "Your grocery list input has been cleared.",
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-primary">
      <AppHeader />
      <main className="flex-grow flex items-center">
        <div className="container mx-auto px-4 md:px-6">
          <Card className="max-w-2xl mx-auto p-6 sm:p-8 shadow-xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="items"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="grocery-items" className="text-lg">
                        Enter Grocery Items
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          id="grocery-items"
                          placeholder="e.g., apples, milk, bread, chicken breast"
                          className="min-h-[120px] resize-none text-base"
                          aria-describedby="items-description"
                          {...field}
                        />
                      </FormControl>
                      <p
                        id="items-description"
                        className="text-sm text-muted-foreground"
                      >
                        Enter items separated by commas, or use the microphone to add items with your voice.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isListening}
                  >
                    {false ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ListPlus className="mr-2 h-4 w-4" />
                    )}
                    Categorize Items
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleClear}
                    disabled={isListening}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear List
                  </Button>
                  {isSpeechSupported && (
                    <Button
                      type="button"
                      variant={isListening ? "destructive" : "outline"}
                      size="icon"
                      onClick={handleMicClick}
                      disabled={false}
                      className={isListening ? "animate-pulse" : ""}
                      aria-label={isListening ? "Stop listening" : "Start listening"}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </Card>
        </div>
      </main>
    </div>
  );
}
