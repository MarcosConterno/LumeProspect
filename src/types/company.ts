export type CompanyLifecycleStatus = "prospect" | "customer" | "inactive";

export type Company = {
  id: string;
  workspaceId: string;
  name: string;
  legalName?: string;
  documentNumber?: string;
  website?: string;
  segment?: string;
  location?: string;
  employeeRange?: string;
  revenueRange?: string;
  lifecycleStatus: CompanyLifecycleStatus;
  becameCustomerAt?: string;
};

export type CompanyContact = {
  id: string;
  companyId: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  website?: string;
  linkedinUrl?: string;
  isPrimary: boolean;
};
