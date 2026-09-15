export type DealStageId = "new" | "contacted" | "diagnosis" | "proposal" | "negotiation";
export type DealStatus = "open" | "won" | "lost";
export type ActivityType = "call" | "whatsapp" | "email" | "meeting" | "follow_up" | "proposal" | "task" | "note";
export type ActivityStatus = "pending" | "completed";

export type DealActivity = {
  id: string;
  dealId: string;
  type: ActivityType;
  title: string;
  description?: string;
  scheduledAt?: string;
  completedAt?: string;
  status: ActivityStatus;
  version?: number;
  createdAt?: string;
};

export type Deal = {
  id: string;
  name?: string;
  workspaceId?: string;
  version?: number;
  ownerId?: string;
  contactId?: string;
  serviceId?: string;
  companyLocation?: string;
  companySize?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyId?: string;
  prospectId?: string;
  companyName: string;
  contactName: string;
  contactRole: string;
  serviceName: string;
  value: number;
  stage: DealStageId;
  ownerName: string;
  expectedCloseDate: string;
  nextActivity?: DealActivity;
  score: number;
  status: DealStatus;
  stageEnteredAt: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  lostReason?: string;
};

export type CrmCompany = { id: string; name: string; location: string | null; employee_range: string | null };
export type CrmContact = { id: string; company_id: string; name: string; role: string | null; email: string | null; phone: string | null };
export type CrmOptions = {
  companies: CrmCompany[];
  contacts: CrmContact[];
  services: { id: string; name: string; active: boolean }[];
  owners: { id: string; name: string }[];
};
export type CrmSnapshot = { deals: Deal[]; options: CrmOptions; workspaceId: string; userId: string; role: string };
export type CrmNote = { id: string; body: string; created_by: string | null; created_at: string; updated_at: string; version: number };
export type CrmFile = { id: string; note_id: string | null; original_name: string; content_type: string; size_bytes: number; status: string; created_by: string | null; created_at: string; version: number };
export type DealDetail = { deal: Deal; activities: DealActivity[]; notes: CrmNote[]; files: CrmFile[] };
export type CrmResult<T> = { data: T; error?: never } | { error: string; data?: never };
export type DealInput = { name: string; companyId: string; contactId: string; serviceId: string; ownerId: string; value: number; stage: DealStageId; expectedCloseDate: string; summary: string; status: DealStatus; lostReason: string };

export type DealStage = {
  id: DealStageId;
  label: string;
  probability: number;
  staleAfterDays: number;
};
