"use client";

import { useState } from "react";
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
              <span>💬</span> Communication
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
        {/* Custom Tab Navigation */}
        <div role="tablist" className="flex border-b border-slate-200 mb-4">
          <Button
            type="button"
            role="tab"
            aria-selected={activeTab === "announcements"}
            variant="ghost"
            onClick={() => setActiveTab("announcements")}
            className={`gap-2 rounded-none border-b-2 text-sm font-medium ${
              activeTab === "announcements"
                ? "border-primary text-primary hover:bg-transparent"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
            }`}
          >
            <span>📢</span>
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
            aria-selected={activeTab === "materials"}
            variant="ghost"
            onClick={() => setActiveTab("materials")}
            className={`gap-2 rounded-none border-b-2 text-sm font-medium ${
              activeTab === "materials"
                ? "border-primary text-primary hover:bg-transparent"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
            }`}
          >
            <span>📁</span>
            <span>Materials</span>
            {materials.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded-full">
                {materials.length}
              </span>
            )}
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === "announcements" && (
          <AnnouncementList announcements={announcements} classId={classId} />
        )}
        {activeTab === "materials" && (
          <MaterialsList materials={materials} classId={classId} />
        )}
      </CardContent>
    </Card>
  );
}
