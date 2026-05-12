"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white p-6 sm:p-10 rounded-[48px] shadow-2xl shadow-slate-200"
      >
        {/* Logo */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden" style={{ boxShadow: "var(--shadow-logo-halo)" }}>
          <Image
            src="/assets/logo.png"
            alt="ATAL AI"
            width={96}
            height={96}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3 text-center">
          ATAL AI
        </h1>
        <p className="text-slate-500 font-bold mb-10 text-center">
          Assam&apos;s Premier Digital Learning Platform
        </p>

        <div className="space-y-4">
          {/* Student — primary orange */}
          <Button
            type="button"
            onClick={() => router.push("/student/start")}
            className="w-full h-auto p-5 justify-start gap-4 font-black whitespace-normal"
            style={{ boxShadow: "var(--shadow-primary)" }}
          >
            <span className="text-3xl">🎓</span>
            <div className="text-left">
              <p className="text-base font-black leading-none">Student Login</p>
              <p className="text-xs font-bold text-white/80 mt-1">
                Sign in or create account
              </p>
            </div>
          </Button>

          {/* Teacher + Admin row */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              onClick={() => router.push("/teacher/start")}
              className="h-auto p-5 flex-col gap-2 text-white font-black"
              style={{ background: "var(--gradient-teacher)" }}
            >
              <span className="text-2xl">👩‍🏫</span>
              <span className="text-sm font-black">Teacher</span>
            </Button>

            <Button
              type="button"
              onClick={() => router.push("/admin/login")}
              className="h-auto p-5 flex-col gap-2 text-white font-black bg-slate-900 hover:bg-slate-800"
            >
              <span className="text-2xl">🔐</span>
              <span className="text-sm font-black">Admin</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
