"use client";

import { useState } from "react";
import { FolderClosed, Megaphone, MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateAnnouncementDialog } from "./CreateAnnouncementDialog";
import { AnnouncementList } from "./AnnouncementList";
import { UploadMaterialDialog } from "./UploadMaterialDialog";
import { Button } from "@/components/ui/button";
import { MaterialsList } from "./MaterialsList";
import type { Announcement, Material } from "@/app/actions/teacher";

interface CommunicationSectionProps {
  readonly classId: string;
  readonly announcements: Announcement[];
  readonly materials: Material[];
}

type TabType = "announcements" | "materials";

export function CommunicationSection({
  classId,
  announcements,
  materials,
}: CommunicationSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("announcements");

  return (
    <Card className="card-responsive">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-(--bento-sky-d)" strokeWidth={2.25} aria-hidden="true" />
              Communication
            </CardTitle>
            <CardDescription>
              Share announcements and learning materials with your students
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <CreateAnnouncementDialog classId={classId} />
            <UploadMaterialDialog classId={classId} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* PR-68: tab/tabpanel pair properly wired via aria-controls. */}
        <div role="tablist" aria-label="Class communication" className="flex border-b border-slate-200 mb-4">
          <Button
            type="button"
            role="tab"
            id="tab-comm-announcements"
            aria-controls="panel-comm"
            aria-selected={activeTab === "announcements"}
            variant="ghost"
            onClick={() => setActiveTab("announcements")}
            className={`gap-2 rounded-none border-b-2 text-sm font-medium ${
              activeTab === "announcements"
                ? "border-primary text-primary hover:bg-transparent"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
            }`}
          >
            <Megaphone size={16} strokeWidth={2.25} aria-hidden="true" />
            <span>Announcements</span>
            {announcements.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded-full">
                {announcements.length}
              </span>
            )}
          </Button>
          <Button
            type="button"
            role="tab"
            id="tab-comm-materials"
            aria-controls="panel-comm"
            aria-selected={activeTab === "materials"}
            variant="ghost"
            onClick={() => setActiveTab("materials")}
            className={`gap-2 rounded-none border-b-2 text-sm font-medium ${
              activeTab === "materials"
                ? "border-primary text-primary hover:bg-transparent"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
            }`}
          >
            <FolderClosed size={16} strokeWidth={2.25} aria-hidden="true" />
            <span>Materials</span>
            {materials.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded-full">
                {materials.length}
              </span>
            )}
          </Button>
        </div>

        {/* Tab Content */}
        <div
          role="tabpanel"
          id="panel-comm"
          aria-labelledby={
            activeTab === "announcements" ? "tab-comm-announcements" : "tab-comm-materials"
          }
        >
          {activeTab === "announcements" && (
            <AnnouncementList announcements={announcements} classId={classId} />
          )}
          {activeTab === "materials" && (
            <MaterialsList materials={materials} classId={classId} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
