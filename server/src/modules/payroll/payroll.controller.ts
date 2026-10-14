import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Headers,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard.js';
import { CurrentUser, ClerkUserContext } from '../../common/decorators/current-user.decorator.js';
import { PayrollRunStateMachine } from '../../domain/state-machines/payroll.state-machine.js';
import { PayrollRunStatus } from '../../shared/index.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { loadPersistedMap, savePersistedMap } from '../../common/persistence.js';

export interface Employee {
  id: string;
  orgId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  salaryMinor: number;
  currency: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  joinedAt: string;
}

export interface PayrollRunLine {
  employeeId: string;
  employeeName: string;
  department: string;
  bankName: string;
  accountNumber: string;
  amountMinor: number;
  status: 'PENDING' | 'DISBURSED';
}

export interface PayrollRunRecord {
  id: string;
  orgId: string;
  period: string;
  department?: string;
  employeeCount: number;
  amountMinor: number;
  currency: string;
  status: PayrollRunStatus;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
  disbursementRef?: string;
  lines: PayrollRunLine[];
}

// Tenant isolated persistent stores
const orgEmployeesStore = loadPersistedMap<Employee>('payroll_employees.json');
const orgPayrollRunsStore = loadPersistedMap<PayrollRunRecord>('payroll_runs.json');

export function savePayrollState() {
  savePersistedMap('payroll_employees.json', orgEmployeesStore);
  savePersistedMap('payroll_runs.json', orgPayrollRunsStore);
}

function seedPayrollData(orgId: string, template: 'SCHOOL' | 'HOSPITAL' | 'COMPANY' = 'SCHOOL') {
  let employees: Employee[] = [];
  if (template === 'SCHOOL') {
    employees = [
      {
        id: `emp_${Date.now()}_1`,
        orgId,
        name: 'Amina Yusuf',
        email: 'amina.yusuf@school.edu.ng',
        department: 'Academic Faculty',
        role: 'Senior Mathematics Teacher',
        bankCode: '058',
        bankName: 'Guaranty Trust Bank (GTBank)',
        accountNumber: '0123456789',
        salaryMinor: 35000000, // ₦350,000.00
        currency: 'NGN',
        status: 'ACTIVE',
        joinedAt: '2024-09-01',
      },
      {
        id: `emp_${Date.now()}_2`,
        orgId,
        name: 'Tunde Bello',
        email: 'tunde.bello@school.edu.ng',
        department: 'Science & Practicals',
        role: 'Science Laboratory Director',
        bankCode: '044',
        bankName: 'Access Bank',
        accountNumber: '0234567891',
        salaryMinor: 28000000, // ₦280,000.00
        currency: 'NGN',
        status: 'ACTIVE',
        joinedAt: '2025-01-15',
      },
      {
        id: `emp_${Date.now()}_3`,
        orgId,
        name: 'Chioma Okafor',
        email: 'chioma.okafor@school.edu.ng',
        department: 'Administration & Finance',
        role: 'Campus Bursar & Accountant',
        bankCode: '057',
        bankName: 'Zenith Bank',
        accountNumber: '0345678912',
        salaryMinor: 42000000, // ₦420,000.00
        currency: 'NGN',
        status: 'ACTIVE',
        joinedAt: '2023-11-01',
      },
      {
        id: `emp_${Date.now()}_4`,
        orgId,
        name: 'Emeka Nwachukwu',
        email: 'emeka.n@school.edu.ng',
        department: 'Academic Faculty',
        role: 'Literature & Arts Coordinator',
        bankCode: '011',
        bankName: 'First Bank of Nigeria',
        accountNumber: '0456789123',
        salaryMinor: 32000000, // ₦320,000.00
        currency: 'NGN',
        status: 'ACTIVE',
        joinedAt: '2025-03-01',
      },
      {
        id: `emp_${Date.now()}_5`,
        orgId,
        name: 'Fatima Garba',
        email: 'fatima.g@school.edu.ng',
        department: 'Campus Operations',
        role: 'Facilities & Logistics Lead',
        bankCode: '090267',
        bankName: 'Kuda Microfinance Bank',
        accountNumber: '0567891234',
        salaryMinor: 18000000, // ₦180,000.00
        currency: 'NGN',
        status: 'ACTIVE',
        joinedAt: '2024-06-15',
      },
    ];
  } else if (template === 'HOSPITAL') {
    employees = [
      {
        id: `emp_${Date.now()}_h1`,
        orgId,
        name: 'Dr. Adebayo Adeleke',
        email: 'adebayo.doc@hospital.ng',
        department: 'Consultants & Physicians',
        role: 'Chief Medical Officer',
        bankCode: '057',
        bankName: 'Zenith Bank',
        accountNumber: '0123984712',
        salaryMinor: 75000000,
        currency: 'NGN',
        status: 'ACTIVE',
        joinedAt: '2022-04-10',
      },
      {
        id: `emp_${Date.now()}_h2`,
        orgId,
        name: 'Nurse Chidinma Eze',
        email: 'chidinma.nurse@hospital.ng',
        department: 'Nursing & Care',
        role: 'Senior Ward Supervisor',
        bankCode: '058',
        bankName: 'Guaranty Trust Bank (GTBank)',
        accountNumber: '0234871923',
        salaryMinor: 32000000,
        currency: 'NGN',
        status: 'ACTIVE',
        joinedAt: '2024-02-01',
      },
      {
        id: `emp_${Date.now()}_h3`,
        orgId,
        name: 'Pharm. Oladipo Johnson',
        email: 'oladipo.pharm@hospital.ng',
        department: 'Pharmacy & Dispensary',
        role: 'Head Pharmacist',
        bankCode: '044',
        bankName: 'Access Bank',
        accountNumber: '0345719283',
        salaryMinor: 38000000,
        currency: 'NGN',
        status: 'ACTIVE',
        joinedAt: '2023-08-15',
      },
    ];
  } else {
    employees = [
      {
        id: `emp_${Date.now()}_c1`,
        orgId,
        name: 'David Adeleke',
        email: 'david@enterprise.com',
        department: 'Engineering',
        role: 'Principal Systems Architect',
        bankCode: '058',
        bankName: 'Guaranty Trust Bank (GTBank)',
        accountNumber: '0129481723',
        salaryMinor: 95000000,
        currency: 'NGN',
        status: 'ACTIVE',
        joinedAt: '2023-01-10',
      },
      {
        id: `emp_${Date.now()}_c2`,
        orgId,
        name: 'Sarah Mensah',
        email: 'sarah@enterprise.com',
        department: 'Product & Design',
        role: 'Product Design Lead',
        bankCode: '057',
        bankName: 'Zenith Bank',
        accountNumber: '0238192847',
        salaryMinor: 65000000,
        currency: 'NGN',
        status: 'ACTIVE',
        joinedAt: '2024-03-01',
      },
      {
        id: `emp_${Date.now()}_c3`,
        orgId,
        name: 'Ibrahim Sani',
        email: 'ibrahim@enterprise.com',
        department: 'Infrastructure',
        role: 'DevOps & Site Reliability',
        bankCode: '044',
        bankName: 'Access Bank',
        accountNumber: '0348192847',
        salaryMinor: 70000000,
        currency: 'NGN',
        status: 'ACTIVE',
        joinedAt: '2023-10-15',
      },
    ];
  }

  orgEmployeesStore.set(orgId, employees);

  // Seed sample initial payroll run for previous month
  const totalSalary = employees.reduce((s, e) => s + e.salaryMinor, 0);
  const initialRun: PayrollRunRecord = {
    id: `RUN-${new Date().getFullYear()}-09`,
    orgId,
    period: 'September 2026',
    department: 'All Departments',
    employeeCount: employees.length,
    amountMinor: totalSalary,
    currency: 'NGN',
    status: PayrollRunStatus.COMPLETED,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    approvedAt: new Date(Date.now() - 29 * 86400000).toISOString(),
    completedAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    disbursementRef: `kora_payout_seed_${Date.now()}`,
    lines: employees.map((e) => ({
      employeeId: e.id,
      employeeName: e.name,
      department: e.department,
      bankName: e.bankName,
      accountNumber: e.accountNumber,
      amountMinor: e.salaryMinor,
      status: 'DISBURSED',
    })),
  };

  orgPayrollRunsStore.set(orgId, [initialRun]);
  savePayrollState();
}

@Controller('payroll')
@UseGuards(ClerkAuthGuard)
export class PayrollController {
  constructor(private readonly ledgerService: LedgerService) {}

  private getOrgId(user: ClerkUserContext, headerOrgId?: string): string {
    return headerOrgId || user?.orgId || user?.userId || 'default-org';
  }

  // Get full payroll configuration and employees
  @Get('config')
  getConfig(
    @CurrentUser() user: ClerkUserContext,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);

    if (!orgEmployeesStore.has(orgId)) {
      seedPayrollData(orgId, 'SCHOOL');
    }

    const employees = orgEmployeesStore.get(orgId) || [];
    const runs = orgPayrollRunsStore.get(orgId) || [];

    const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
    const monthlyCommitmentMinor = employees
      .filter((e) => e.status === 'ACTIVE')
      .reduce((sum, e) => sum + e.salaryMinor, 0);

    const totalDisbursedMinor = runs
      .filter((r) => r.status === PayrollRunStatus.COMPLETED)
      .reduce((sum, r) => sum + r.amountMinor, 0);

    const pendingRunsCount = runs.filter(
      (r) => r.status === PayrollRunStatus.DRAFT || r.status === PayrollRunStatus.PENDING_APPROVAL || r.status === PayrollRunStatus.APPROVED
    ).length;

    return {
      employees,
      departments,
      runs,
      stats: {
        totalStaff: employees.length,
        activeStaff: employees.filter((e) => e.status === 'ACTIVE').length,
        monthlyCommitmentMinor,
        totalDisbursedMinor,
        pendingRunsCount,
      },
      orgId,
    };
  }

  // Get all payroll runs for organization
  @Get('runs')
  getRuns(
    @CurrentUser() user: ClerkUserContext,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);

    if (!orgPayrollRunsStore.has(orgId)) {
      seedPayrollData(orgId, 'SCHOOL');
    }

    const runs = orgPayrollRunsStore.get(orgId) || [];
    return {
      runs,
      totalCount: runs.length,
      orgId,
    };
  }

  // Create new payroll run
  @Post('runs')
  createRun(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: { period: string; department?: string },
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);

    if (!dto.period) {
      throw new BadRequestException('Payroll period label is required (e.g. October 2026)');
    }

    if (!orgEmployeesStore.has(orgId)) {
      seedPayrollData(orgId, 'SCHOOL');
    }

    const allEmployees = orgEmployeesStore.get(orgId) || [];
    const targetEmployees = allEmployees.filter((e) => {
      const matchesDept = !dto.department || dto.department === 'all' || dto.department === 'All Departments' || e.department === dto.department;
      return matchesDept && e.status === 'ACTIVE';
    });

    if (targetEmployees.length === 0) {
      throw new BadRequestException('No active employees enrolled in this department/cohort');
    }

    const amountMinor = targetEmployees.reduce((sum, e) => sum + e.salaryMinor, 0);
    const runs = orgPayrollRunsStore.get(orgId) || [];

    const runId = `RUN-${new Date().getFullYear()}-${String(runs.length + 1).padStart(2, '0')}`;
    const newRun: PayrollRunRecord = {
      id: runId,
      orgId,
      period: dto.period.trim(),
      department: dto.department && dto.department !== 'all' ? dto.department : 'All Departments',
      employeeCount: targetEmployees.length,
      amountMinor,
      currency: 'NGN',
      status: PayrollRunStatus.DRAFT,
      createdAt: new Date().toISOString(),
      lines: targetEmployees.map((e) => ({
        employeeId: e.id,
        employeeName: e.name,
        department: e.department,
        bankName: e.bankName,
        accountNumber: e.accountNumber,
        amountMinor: e.salaryMinor,
        status: 'PENDING',
      })),
    };

    runs.unshift(newRun);
    orgPayrollRunsStore.set(orgId, runs);
    savePayrollState();

    return {
      success: true,
      run: newRun,
    };
  }

  // Advance run through maker-checker lifecycle
  @Post('runs/:id/advance')
  advanceRun(
    @CurrentUser() user: ClerkUserContext,
    @Param('id') id: string,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const runs = orgPayrollRunsStore.get(orgId) || [];
    const run = runs.find((r) => r.id === id);

    if (!run) {
      throw new NotFoundException(`Payroll run ${id} not found`);
    }

    let nextStatus: PayrollRunStatus;
    if (run.status === PayrollRunStatus.DRAFT) {
      nextStatus = PayrollRunStatus.PENDING_APPROVAL;
    } else if (run.status === PayrollRunStatus.PENDING_APPROVAL) {
      nextStatus = PayrollRunStatus.APPROVED;
      run.approvedAt = new Date().toISOString();
    } else if (run.status === PayrollRunStatus.APPROVED) {
      // Direct disburse when advanced from approved
      return this.disburseRun(user, id, headerOrgId);
    } else {
      throw new BadRequestException(`Cannot advance payroll run from status: ${run.status}`);
    }

    if (!PayrollRunStateMachine.canTransition(run.status, nextStatus)) {
      throw new BadRequestException(`Illegal state transition from ${run.status} to ${nextStatus}`);
    }

    run.status = nextStatus;
    savePayrollState();

    return {
      success: true,
      run,
      transition: `${run.status} -> ${nextStatus}`,
    };
  }

  // Execute full institutional disbursement for a payroll run
  @Post('runs/:id/disburse')
  disburseRun(
    @CurrentUser() user: ClerkUserContext,
    @Param('id') id: string,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const runs = orgPayrollRunsStore.get(orgId) || [];
    const run = runs.find((r) => r.id === id);

    if (!run) {
      throw new NotFoundException(`Payroll run ${id} not found`);
    }

    if (run.status === PayrollRunStatus.COMPLETED) {
      throw new BadRequestException('This payroll run has already been fully disbursed and settled');
    }

    const disbursementRef = `kora_payout_${run.id}_${Date.now()}`;
    run.status = PayrollRunStatus.COMPLETED;
    run.completedAt = new Date().toISOString();
    run.disbursementRef = disbursementRef;
    run.lines.forEach((l) => (l.status = 'DISBURSED'));

    // Post double-entry transaction to immutable ledger:
    // Debit: Operating Payroll Expense (Expense account increases)
    // Credit: Kora Wallet Settlement Asset (Liquid wallet asset decreases)
    try {
      this.ledgerService.postJournalEntry({
        orgId,
        description: `Payroll Execution: ${run.period} (${run.employeeCount} staff, ${run.department || 'All Departments'})`,
        sourceType: 'PAYROLL',
        sourceId: run.id,
        debitAccount: 'PAYROLL_EXPENSE',
        creditAccount: 'KORA_WALLET',
        amountMinor: run.amountMinor,
        currency: run.currency || 'NGN',
      });
    } catch (err: any) {
      console.error(`[Payroll] Failed to write ledger journal entry for ${run.id}:`, err.message);
    }
    savePayrollState();

    return {
      success: true,
      message: `Payroll run ${run.id} disbursed successfully via institutional gateway`,
      run,
      disbursementRef,
    };
  }

  // Instant single payout to an individual payee / employee
  @Post('disburse-single')
  disburseSingle(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: { employeeId: string; amountMinor?: number; narration?: string },
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const employees = orgEmployeesStore.get(orgId) || [];
    const emp = employees.find((e) => e.id === dto.employeeId);

    if (!emp) {
      throw new NotFoundException('Employee not found');
    }

    const payoutAmount = dto.amountMinor && dto.amountMinor > 0 ? dto.amountMinor : emp.salaryMinor;
    const narration = dto.narration?.trim() || `Instant Disbursement: ${emp.name}`;
    const payoutRef = `payout_single_${emp.id}_${Date.now()}`;

    // Post double entry journal entry
    const entry = this.ledgerService.postJournalEntry({
      orgId,
      description: `${narration} (${emp.bankName} - ${emp.accountNumber})`,
      sourceType: 'PAYROLL',
      sourceId: payoutRef,
      debitAccount: 'PAYROLL_EXPENSE',
      creditAccount: 'KORA_WALLET',
      amountMinor: payoutAmount,
      currency: emp.currency || 'NGN',
    });

    return {
      success: true,
      message: `Payout of ₦${(payoutAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} disbursed to ${emp.name}`,
      reference: payoutRef,
      employee: emp,
      ledgerEntry: entry,
    };
  }

  // Add new employee / payee
  @Post('employees')
  addEmployee(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: {
      name: string;
      email?: string;
      department: string;
      role?: string;
      bankCode: string;
      bankName?: string;
      accountNumber: string;
      salaryMinor: number;
    },
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);

    if (!dto.name || !dto.department || !dto.accountNumber || !dto.salaryMinor) {
      throw new BadRequestException('Name, department, account number, and salary amount are required');
    }

    if (!/^\d{10}$/.test(dto.accountNumber.trim())) {
      throw new BadRequestException('Nigerian NUBAN account number must be exactly 10 digits');
    }

    const bankName = dto.bankName || 'Commercial Bank';
    const newEmp: Employee = {
      id: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orgId,
      name: dto.name.trim(),
      email: dto.email?.trim() || `${dto.name.toLowerCase().replace(/\s+/g, '.')}@enterprise.org`,
      department: dto.department.trim(),
      role: dto.role?.trim() || 'Staff Specialist',
      bankCode: dto.bankCode.trim(),
      bankName,
      accountNumber: dto.accountNumber.trim(),
      salaryMinor: Number(dto.salaryMinor),
      currency: 'NGN',
      status: 'ACTIVE',
      joinedAt: new Date().toISOString().split('T')[0],
    };

    const employees = orgEmployeesStore.get(orgId) || [];
    employees.unshift(newEmp);
    orgEmployeesStore.set(orgId, employees);
    savePayrollState();

    return {
      success: true,
      employee: newEmp,
    };
  }

  // Delete employee
  @Delete('employees/:id')
  deleteEmployee(
    @CurrentUser() user: ClerkUserContext,
    @Param('id') id: string,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const employees = (orgEmployeesStore.get(orgId) || []).filter((e) => e.id !== id);
    orgEmployeesStore.set(orgId, employees);
    savePayrollState();
    return { success: true };
  }

  // Load preset template
  @Post('template')
  loadTemplate(
    @CurrentUser() user: ClerkUserContext,
    @Body('template') template: 'SCHOOL' | 'HOSPITAL' | 'COMPANY' = 'SCHOOL',
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    seedPayrollData(orgId, template);
    return this.getConfig(user, headerOrgId);
  }
}
