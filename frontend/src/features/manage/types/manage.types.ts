export interface MenuItem {
  id: string;
  label: string;
  path: string;
  component: React.ComponentType;
}

export interface ManageCategory {
  id: string;
  label: string;
  items: MenuItem[];
}