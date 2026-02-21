export interface ClinicBranch {
  id: number;
  name: string;
  branch_code: string;
  is_main_branch: boolean;
  is_branch: boolean;
  parent_clinic: number | null;
  parent_name: string | null;
  is_active: boolean;
  city: string;
  province: string;
}

export interface ClinicBranchesResponse {
  branches: ClinicBranch[];
  main_clinic_id: number;
}