"use client";

/**
 * AI Tutor Call-to-Action Component
 *
 * Displays a card prompting users to chat with the AI Tutor.
 */

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export function AiTutorCTA() {
  const { t } = useLanguage();

  return (
    <Card className="bg-linear-to-r from-primary/10 to-cyan/10 border-primary/20">
      <CardContent className="p-6 text-center">
        <div className="text-4xl mb-2">🤖</div>
        <h3 className="text-lg font-black mb-1">{t("learn.needHelp")}</h3>
        <p className="text-sm text-slate-500 mb-4">
          {t("learn.askAiTutor")}
        </p>
        <Link href="/app/ai-tools/tutor">
          <Button className="bg-linear-to-r from-primary to-cyan">
            {t("learn.chatWithTutor")}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
