"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { clientLogger } from "@/lib/client-logger";
import { CLIPBOARD_TIMING } from "@/lib/constants/ui-timings";
import {
  rotateStaffPin,
  searchSchools,
} from "@/app/actions/school";
import {
  getDistricts,
  getBlocksByDistrict,
  getSchoolsByDistrictAndBlock,
  getSchoolPinStatus,
  type District,
  type Block,
  type SchoolData,
} from "@/app/actions/school-finder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Calendar,
  Check,
  ClipboardList,
  Copy,
  Lock,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
} from "lucide-react";

// School Finder Modal Component
function SchoolFinderModal({
  isOpen,
  onClose,
  onSelectSchool,
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onSelectSchool: (school: SchoolData) => Promise<void>;
}>) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Load districts on mount
  useEffect(() => {
    if (isOpen) {
      loadDistricts();
    }
  }, [isOpen]);

  // Load blocks when district changes
  useEffect(() => {
    if (selectedDistrict) {
      // Clear dependent state BEFORE async load (prevent race condition)
      setSelectedBlock("");
      setSchools([]);
      // loadBlocks() will set blocks asynchronously when fetch completes
      loadBlocks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict]);

  // Load schools when district OR block changes
  useEffect(() => {
    if (selectedDistrict) {
      loadSchools();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict, selectedBlock]);

  async function loadDistricts() {
    setLoading(true);
    try {
      const result = await getDistricts();
      if (result.success) {
        setDistricts(result.data);
      } else {
        toast.error(result.error || "Failed to load districts");
      }
    } catch (error) {
      clientLogger.error(
        "[SchoolFinderModal] Failed to load districts",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function loadBlocks() {
    if (!selectedDistrict) return;

    // Clear blocks state BEFORE fetch to show loading state cleanly (prevent flicker)
    setBlocks([]);
    setLoading(true);
    try {
      const result = await getBlocksByDistrict(selectedDistrict);
      if (result.success) {
        setBlocks(result.data);
      } else {
        toast.error(result.error || "Failed to load blocks");
      }
    } catch (error) {
      clientLogger.error(
        "[SchoolFinderModal] Failed to load blocks",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function loadSchools() {
    if (!selectedDistrict) return;

    setLoading(true);
    try {
      const result = await getSchoolsByDistrictAndBlock(
        selectedDistrict,
        selectedBlock || undefined,
      );
      if (result.success) {
        setSchools(result.data);
      } else {
        toast.error(result.error || "Failed to load schools");
      }
    } catch (error) {
      clientLogger.error(
        "[SchoolFinderModal] Failed to load schools",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-6 max-w-2xl w-full mx-4 max-h-96 overflow-auto">
        <h2 className="text-xl font-black mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Find School by Location
        </h2>

        {/* District Selection */}
        <div className="mb-4">
          <label htmlFor="district-select" className="text-sm font-semibold mb-2 block">District</label>
          <select
            id="district-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
            disabled={loading}
          >
            <option value="">-- Select District --</option>
            {districts.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Block Selection */}
        {selectedDistrict && (
          <div className="mb-4">
            <label htmlFor="block-select" className="text-sm font-semibold mb-2 block">Block</label>
            <select
              id="block-select"
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-sm"
              disabled={loading}
            >
              <option value="">-- All Blocks --</option>
              {blocks.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name || "Not Specified"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Schools List */}
        {schools.length > 0 && (
          <div className="border border-slate-200 rounded-lg divide-y max-h-64 overflow-y-auto">
            {schools.map((school) => (
              <Button
                type="button"
                variant="ghost"
                key={school.id}
                onClick={async () => {
                  try {
                    await onSelectSchool(school);
                  } finally {
                    onClose();
                  }
                }}
                className="w-full justify-start h-auto p-3 hover:bg-slate-50 text-left whitespace-normal block rounded-none"
                disabled={loading}
              >
                <div className="font-semibold text-sm text-slate-800">
                  {school.school_name}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-normal">
                  <strong>Code:</strong> {school.school_code} •{" "}
                  <strong>Block:</strong> {school.block || "N/A"}
                </div>
                {school.address && (
                  <div className="text-xs text-slate-400 mt-1 font-normal">
                    {school.address}
                  </div>
                )}
              </Button>
            ))}
          </div>
        )}

        {selectedDistrict && schools.length === 0 && !loading && (
          <div className="text-center py-4 text-slate-400 text-sm">
            No schools found in{" "}
            {selectedBlock ? `${selectedBlock} block` : "this district"}
          </div>
        )}

        {/* Close Button */}
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="mt-4 w-full text-slate-700 font-black"
        >
          Close
        </Button>
      </div>
    </div>
  );
}

// Copy to Clipboard Component
function CopyButton({ text }: Readonly<{ text: string }>) {
  const [copied, setCopied] = useState(false);

  // ERR-006 FIX: Add error handling for clipboard API
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), CLIPBOARD_TIMING.successFeedback);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={`h-9 w-9 rounded ${copied ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-50" : "bg-slate-50 hover:bg-slate-100 text-slate-500"}`}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

// PIN Status Display Component
function PinStatusDisplay({
  pinStatus,
  schoolCode,
  loading,
  onCheckStatus,
}: Readonly<{
  pinStatus: {
    exists: boolean;
    createdAt?: string;
    lastRotatedAt?: string;
  } | null;
  schoolCode: string;
  loading: boolean;
  onCheckStatus: (code: string) => void;
}>) {
  if (!pinStatus) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onCheckStatus(schoolCode)}
        disabled={loading}
        className="text-slate-700 font-black"
      >
        {loading ? "Checking..." : "Check PIN Status"}
      </Button>
    );
  }

  if (pinStatus.exists) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <p className="text-xs text-blue-800 font-semibold">✓ PIN Exists</p>
        <p className="text-sm text-blue-800 mt-2">
          <strong>Created:</strong>{" "}
          {pinStatus.createdAt
            ? new Date(pinStatus.createdAt).toLocaleDateString()
            : "N/A"}
        </p>
        {pinStatus.lastRotatedAt && (
          <p className="text-sm text-blue-800">
            <strong>Last Rotated:</strong>{" "}
            {new Date(pinStatus.lastRotatedAt).toLocaleDateString()}
          </p>
        )}
        <p className="text-xs text-blue-600 mt-3 font-semibold">
          👇 Scroll down to Step 3 to rotate the PIN
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
      <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
        <AlertTriangle size={12} strokeWidth={2.5} aria-hidden="true" /> No PIN Found
      </p>
      <p className="text-sm text-amber-800 mt-2">
        This school doesn&apos;t have a PIN yet. Create one in Step 3.
      </p>
      <p className="text-xs text-amber-600 mt-3 font-semibold">
        👇 Scroll down to Step 3 to create the PIN
      </p>
    </div>
  );
}

// Main Admin Panel — rendered after the server page verifies admin role.
export function SchoolsClient() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SchoolData[]>([]);
  const [finderModalOpen, setFinderModalOpen] = useState(false);

  // Selected school data
  const [selectedSchool, setSelectedSchool] = useState<{
    id: string;
    code: string;
    name: string;
  } | null>(null);

  // PIN Rotation form
  const [schoolCode, setSchoolCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // PIN status
  const [pinStatus, setPinStatus] = useState<{
    exists: boolean;
    createdAt?: string;
    lastRotatedAt?: string;
  } | null>(null);

  // Search schools by code or name
  async function handleSearch() {
    if (!searchQuery.trim()) {
      toast.error("Please enter a school code or name");
      return;
    }

    setLoading(true);
    try {
      const result = await searchSchools(searchQuery);
      if (result?.success && result?.data) {
        setSearchResults(result.data);
        if (result.data.length === 0) {
          toast.info("No schools found matching your search");
        }
      } else {
        toast.error(result?.error || "Failed to search schools");
      }
    } catch (error) {
      clientLogger.error(
        "[AdminSchoolsPage] Failed to search schools",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("An error occurred while searching");
    } finally {
      setLoading(false);
    }
  }

  // Handle school selection from search or finder
  async function handleSelectSchool(school: SchoolData) {
    setSelectedSchool({
      id: school.id,
      code: school.school_code,
      name: school.school_name,
    });
    setSchoolCode(school.school_code);
    setSearchResults([]);
    setSearchQuery("");

    // Auto-fetch PIN status
    await handleGetPinStatus(school.school_code);
  }

  // Get PIN status
  async function handleGetPinStatus(code: string) {
    const codeToCheck = code || schoolCode;
    if (!codeToCheck.trim()) {
      toast.error("Please enter a school code");
      return;
    }

    setLoading(true);
    try {
      const result = await getSchoolPinStatus(codeToCheck.toUpperCase().trim());
      if (result.success) {
        setPinStatus({
          exists: result.exists,
          createdAt: result.createdAt,
          lastRotatedAt: result.lastRotatedAt,
        });
      } else {
        toast.error(result.error || "Failed to fetch PIN status");
      }
    } catch (error) {
      clientLogger.error(
        "[AdminSchoolsPage] Failed to fetch PIN status",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Rotate or create PIN
  async function handleRotatePin(e: React.SyntheticEvent) {
    e.preventDefault();

    if (!schoolCode.trim()) {
      toast.error("Please enter a school code");
      return;
    }

    if (newPin.length < 4) {
      toast.error("PIN must be at least 4 characters long");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    setLoading(true);
    try {
      const result = await rotateStaffPin(
        schoolCode.toUpperCase().trim(),
        newPin,
      );

      if (result.success) {
        const action = pinStatus?.exists ? "rotated" : "created";
        toast.success(`PIN ${action} successfully for ${result.schoolName}`);
        setNewPin("");
        setConfirmPin("");

        // Refresh PIN status
        await handleGetPinStatus(schoolCode);
      } else {
        toast.error(result.error || "Failed to rotate PIN");
      }
    } catch (error) {
      clientLogger.error(
        "[AdminSchoolsPage] Failed to rotate PIN",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }


  const pinActionLabel = pinStatus?.exists ? "Rotate" : "Create";

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-6 pb-28">
      <div className="max-w-3xl mx-auto">
        {/* One-line role-tinted heading (utility-page pattern — banners are
            reserved for top-level dashboards). */}
        <div className="flex items-center justify-between gap-4 flex-wrap pt-2 pb-4 mb-4 border-b border-slate-200">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-[#1E3A5F] inline-flex items-center gap-2">
              <Shield className="w-6 h-6 shrink-0" strokeWidth={2.25} aria-hidden="true" />
              School Management
            </h1>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">
              Assam Digital Initiative • Admin Portal
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
            <Lock className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
            Secure
          </div>
        </div>

        {/* School Finder Modal */}
        <SchoolFinderModal
          isOpen={finderModalOpen}
          onClose={() => setFinderModalOpen(false)}
          onSelectSchool={handleSelectSchool}
        />

        {/* Step 1: Find School */}
        <div className="mb-6 p-6 bg-white border border-slate-100 rounded-3xl">
          <h2 className="text-lg font-black mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-[#1E3A5F]" strokeWidth={2.25} aria-hidden="true" />
            Step 1: Find School
          </h2>

          <div className="space-y-4">
            {/* Quick Search */}
            <div>
              <label htmlFor="school-search" className="text-sm font-medium mb-2 block">
                Quick Search by Code or Name
              </label>
              <div className="flex gap-2">
                <Input
                  id="school-search"
                  placeholder="e.g., 14H0182 or School Name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={handleSearch}
                  disabled={loading}
                  className="shrink-0"
                  style={{ background: "var(--gradient-admin)" }}
                  aria-label="Search schools"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchResults.map((school) => (
                  <Button
                    type="button"
                    variant="ghost"
                    key={school.id}
                    onClick={() => handleSelectSchool(school)}
                    className="w-full justify-between h-auto p-3 hover:bg-slate-50 text-left whitespace-normal rounded-none"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-800">
                        {school.school_name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 font-normal">
                        {school.school_code} • {school.district}
                      </div>
                    </div>
                    <Copy className="h-4 w-4 text-slate-400" />
                  </Button>
                ))}
              </div>
            )}

            {/* Hierarchical Finder Button */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFinderModalOpen(true)}
              className="w-full border-2 border-[#1E3A5F]/30 bg-white text-[#1E3A5F] font-black hover:bg-[#1E3A5F]/5"
            >
              <MapPin className="h-4 w-4" />
              Or Browse by District &amp; Block
            </Button>
          </div>

          {/* Selected School Display */}
          {selectedSchool && (
            <div className="mt-4 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-emerald-700 font-semibold">
                    ✓ Selected School
                  </p>
                  <p className="text-sm text-emerald-700 font-semibold mt-1">
                    {selectedSchool.name}
                  </p>
                  <p className="text-xs text-emerald-700 font-mono mt-1">
                    Code: {selectedSchool.code}
                  </p>
                </div>
                <CopyButton text={selectedSchool.code} />
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Check/Create PIN */}
        {selectedSchool && (
          <div className="mb-6 p-6 bg-white border border-slate-100 rounded-3xl">
            <h2 className="text-lg font-black mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#1E3A5F]" strokeWidth={2.25} aria-hidden="true" />
              Step 2: PIN Status
            </h2>

            <div className="space-y-4">
              <PinStatusDisplay
                pinStatus={pinStatus}
                schoolCode={schoolCode}
                loading={loading}
                onCheckStatus={handleGetPinStatus}
              />
            </div>
          </div>
        )}

        {/* Step 3: Rotate/Create PIN */}
        {selectedSchool && (
          <div className="p-6 bg-white border border-slate-100 rounded-3xl">
            <h2 className="text-lg font-black mb-4 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-[#1E3A5F]" strokeWidth={2.25} aria-hidden="true" />
              Step 3: {pinActionLabel} PIN
            </h2>

            <form onSubmit={handleRotatePin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school-code-rotate" className="text-sm">
                  School Code
                </Label>
                <Input
                  id="school-code-rotate"
                  type="text"
                  value={schoolCode}
                  disabled
                  className="bg-slate-50 uppercase font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-pin" className="text-sm">
                  {pinStatus?.exists ? "New" : ""} Staff PIN
                </Label>
                <Input
                  id="new-pin"
                  type="password"
                  placeholder="e.g., 1234"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  required
                  disabled={loading}
                  minLength={4}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500">
                  Min 4 characters (numeric recommended)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pin" className="text-sm">
                  Confirm PIN
                </Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  placeholder="Re-enter PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  required
                  disabled={loading}
                  minLength={4}
                  className="font-mono text-sm"
                />
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded text-xs text-amber-800">
                <p className="flex items-center gap-1.5 font-semibold">
                  <ShieldAlert size={14} strokeWidth={2.5} aria-hidden="true" />
                  <strong>Security Notice</strong>
                </p>
                <p className="mt-1">
                  PIN will be bcrypt hashed.{" "}
                  {pinStatus?.exists
                    ? "Old PIN becomes invalid immediately."
                    : "Teachers can use this PIN for registration."}
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || newPin !== confirmPin || newPin.length < 4}
                className="w-full font-black"
                style={{ background: "var(--gradient-admin)" }}
              >
                <RefreshCw className="h-4 w-4" />
                {loading ? "Processing..." : `${pinActionLabel} PIN`}
              </Button>
            </form>

            {/* Help */}
            <div className="mt-6 bg-blue-50 border border-slate-100 p-4 rounded-2xl">
              <h3 className="font-black text-slate-800 text-sm mb-2 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" strokeWidth={2.25} aria-hidden="true" />
                Quick Guide
              </h3>
              <ul className="text-sm text-slate-500 space-y-2">
                <li>
                  <strong>Step 1:</strong> Search schools or browse by
                  district/block
                </li>
                <li>
                  <strong>Step 2:</strong> Click school → Code auto-fills →
                  Check PIN status
                </li>
                <li>
                  <strong>Step 3:</strong>{" "}
                  {pinStatus?.exists ? "Rotate" : "Create"} PIN for teachers
                </li>
                <li>
                  <strong>Result:</strong> Teachers use code + PIN for
                  registration
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
