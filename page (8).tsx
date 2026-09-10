import { BookingApp } from "@/components/BookingApp";
import { AssistantChat } from "@/components/AssistantChat";

export default function Home() {
  return (
    <main className="min-h-screen flex justify-center relative">
      <div className="w-full max-w-phone min-h-screen bg-white shadow-[0_0_48px_rgba(131,24,67,0.1)] relative overflow-hidden">
        <BookingApp />
      </div>
      <AssistantChat role="client" />
    </main>
  );
}
