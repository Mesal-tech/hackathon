import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Headers,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard.js';
import { CurrentUser, ClerkUserContext } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { BillStatus, PaymentStatus, SupportedCurrency } from '../../shared/index.js';
import { KoraGateway } from '../../gateway/index.js';
import { invoiceNotificationService } from './invoice-notification.service.js';

export interface PayerGroup {
  id: string;
  name: string;
  code?: string;
  description?: string;
  linkedItemIds?: string[];
  customItemPrices?: Record<string, number>; // { [itemId]: amountMinor }
}

export interface BillingItem {
  id: string;
  name: string;
  category: string;
  defaultAmountMinor: number;
  applicableGroupIds?: string[];
  groupPrices?: Record<string, number>; // { [groupId]: amountMinor }
}

export interface Payer {
  id: string;
  name: string;
  identifier: string;
  groupId: string;
  email?: string;
  phone?: string;
}

export interface BillItemLine {
  itemId?: string;
  description: string;
  amountMinor: number;
}

export interface Bill {
  id: string;
  orgId: string;
  token: string;
  payerId?: string;
  payerName: string;
  payerEmail?: string;
  groupId?: string;
  groupName?: string;
  items: BillItemLine[];
  totalAmountMinor: number;
  currency: string;
  status: BillStatus;
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  sentAt?: string;
  sentCount?: number;
  koraReference?: string;
  koraCheckoutUrl?: string;
}

export interface OrgKoraConfig {
  secretKey?: string;
  publicKey?: string;
  webhookSecret?: string;
}

// In-memory tenant isolated stores
const orgGroupsStore = new Map<string, PayerGroup[]>();
const orgItemsStore = new Map<string, BillingItem[]>();
const orgPayersStore = new Map<string, Payer[]>();
const orgBillsStore = new Map<string, Bill[]>();
const orgKoraConfigStore = new Map<string, OrgKoraConfig>();

// Initialize default seed data for an org based on preset
function seedOrgData(orgId: string, template: 'SCHOOL' | 'HOSPITAL' | 'COMPANY' | 'EMPTY' = 'SCHOOL') {
  if (template === 'SCHOOL') {
    const groups: PayerGroup[] = [
      {
        id: 'grp_grade_1',
        name: 'Grade 1',
        code: 'G1',
        description: 'Elementary first grade',
        linkedItemIds: ['item_tuition', 'item_books', 'item_bus'],
        customItemPrices: {
          item_tuition: 12000000, // Grade 1 School Fees: ₦120,000
          item_books: 1800000,
          item_bus: 3500000,
        },
      },
      {
        id: 'grp_grade_2',
        name: 'Grade 2',
        code: 'G2',
        description: 'Elementary second grade',
        linkedItemIds: ['item_tuition', 'item_practical', 'item_bus'],
        customItemPrices: {
          item_tuition: 15000000, // Grade 2 School Fees: ₦150,000
          item_practical: 2500000,
          item_bus: 3500000,
        },
      },
      {
        id: 'grp_grade_3',
        name: 'Grade 3',
        code: 'G3',
        description: 'Elementary third grade',
        linkedItemIds: ['item_tuition', 'item_practical'],
        customItemPrices: {
          item_tuition: 18000000, // Grade 3 School Fees: ₦180,000
          item_practical: 3000000,
        },
      },
    ];
    const items: BillingItem[] = [
      {
        id: 'item_tuition',
        name: 'First Term School Fees',
        category: 'Tuition',
        defaultAmountMinor: 15000000, // Default baseline ₦150,000
        applicableGroupIds: ['grp_grade_1', 'grp_grade_2', 'grp_grade_3'],
        groupPrices: {
          grp_grade_1: 12000000, // Grade 1 pays ₦120,000
          grp_grade_2: 15000000, // Grade 2 pays ₦150,000
          grp_grade_3: 18000000, // Grade 3 pays ₦180,000
        },
      },
      { id: 'item_practical', name: 'Science & Lab Practicals', category: 'Practicals', defaultAmountMinor: 2500000, applicableGroupIds: ['grp_grade_2', 'grp_grade_3'] },
      { id: 'item_books', name: 'Curriculum Books & Uniform', category: 'Materials', defaultAmountMinor: 1800000, applicableGroupIds: ['grp_grade_1'] },
      { id: 'item_bus', name: 'School Bus & Transit', category: 'Logistics', defaultAmountMinor: 3500000, applicableGroupIds: ['grp_grade_1', 'grp_grade_2'] },
    ];
    const payers: Payer[] = [
      { id: 'pyr_1', name: 'Adaobi Eze', identifier: 'STU-2026-001', groupId: 'grp_grade_1', email: 'adaobi.parent@example.com' },
      { id: 'pyr_2', name: 'Emeka Okafor', identifier: 'STU-2026-002', groupId: 'grp_grade_1', email: 'emeka.parent@example.com' },
      { id: 'pyr_3', name: 'Chinedu Bello', identifier: 'STU-2026-003', groupId: 'grp_grade_2', email: 'chinedu.parent@example.com' },
      { id: 'pyr_4', name: 'Fatima Aliyu', identifier: 'STU-2026-004', groupId: 'grp_grade_3', email: 'fatima.parent@example.com' },
    ];

    orgGroupsStore.set(orgId, groups);
    orgItemsStore.set(orgId, items);
    orgPayersStore.set(orgId, payers);
    
    // Seed sample initial bill for Grade 1 student (Adaobi Eze: ₦120,000 School Fees + ₦18,000 Books)
    const initialBill: Bill = {
      id: `bill_${Date.now()}`,
      orgId,
      token: `tok_${crypto.randomBytes(8).toString('hex')}`,
      payerId: 'pyr_1',
      payerName: 'Adaobi Eze',
      payerEmail: 'adaobi.parent@example.com',
      groupId: 'grp_grade_1',
      groupName: 'Grade 1',
      items: [
        { itemId: 'item_tuition', description: 'First Term School Fees', amountMinor: 12000000 },
        { itemId: 'item_books', description: 'Curriculum Books & Uniform', amountMinor: 1800000 },
      ],
      totalAmountMinor: 13800000,
      currency: 'NGN',
      status: BillStatus.ISSUED,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      sentCount: 1,
    };
    orgBillsStore.set(orgId, [initialBill]);
  } else if (template === 'HOSPITAL') {
    const groups: PayerGroup[] = [
      { id: 'grp_outpatient', name: 'Outpatient Clinic', code: 'OPD', linkedItemIds: ['item_consultation', 'item_lab_panel'] },
      { id: 'grp_inpatient', name: 'Inpatient Ward A', code: 'W-A', linkedItemIds: ['item_consultation', 'item_lab_panel'] },
    ];
    const items: BillingItem[] = [
      { id: 'item_consultation', name: 'Specialist Consultation', category: 'Medical', defaultAmountMinor: 1000000, applicableGroupIds: ['grp_outpatient', 'grp_inpatient'] },
      { id: 'item_lab_panel', name: 'Comprehensive Blood Panel', category: 'Laboratory', defaultAmountMinor: 2000000, applicableGroupIds: ['grp_outpatient', 'grp_inpatient'] },
    ];
    const payers: Payer[] = [
      { id: 'pyr_h1', name: 'Folake Adeleke', identifier: 'PAT-8841', groupId: 'grp_outpatient' },
    ];
    orgGroupsStore.set(orgId, groups);
    orgItemsStore.set(orgId, items);
    orgPayersStore.set(orgId, payers);
    orgBillsStore.set(orgId, []);
  } else {
    orgGroupsStore.set(orgId, []);
    orgItemsStore.set(orgId, []);
    orgPayersStore.set(orgId, []);
    orgBillsStore.set(orgId, []);
  }
}

@Controller()
export class BillingController {
  private getOrgId(user: ClerkUserContext, headerOrgId?: string): string {
    return headerOrgId || user?.orgId || user?.userId || 'default-org';
  }

  // Get full billing configuration (groups, fee items catalog, and payers)
  @Get('billing/config')
  @UseGuards(ClerkAuthGuard)
  getBillingConfig(
    @CurrentUser() user: ClerkUserContext,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);

    if (!orgGroupsStore.has(orgId)) {
      seedOrgData(orgId, 'SCHOOL');
    }

    return {
      groups: orgGroupsStore.get(orgId) || [],
      items: orgItemsStore.get(orgId) || [],
      payers: orgPayersStore.get(orgId) || [],
      orgId,
    };
  }

  // Load a preset template (SCHOOL, HOSPITAL, COMPANY, EMPTY)
  @Post('billing/template')
  @UseGuards(ClerkAuthGuard)
  loadTemplate(
    @CurrentUser() user: ClerkUserContext,
    @Body('template') template: 'SCHOOL' | 'HOSPITAL' | 'COMPANY' | 'EMPTY',
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    seedOrgData(orgId, template || 'SCHOOL');

    return {
      success: true,
      groups: orgGroupsStore.get(orgId) || [],
      items: orgItemsStore.get(orgId) || [],
      payers: orgPayersStore.get(orgId) || [],
    };
  }

  // --- GROUPS (COHORTS) ---
  @Post('billing/groups')
  @UseGuards(ClerkAuthGuard)
  createGroup(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: { name: string; code?: string; description?: string; linkedItemIds?: string[] },
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    if (!dto.name) throw new BadRequestException('Group name is required');

    const groups = orgGroupsStore.get(orgId) || [];
    const newGroup: PayerGroup = {
      id: `grp_${Date.now()}`,
      name: dto.name.trim(),
      code: dto.code?.trim() || dto.name.substring(0, 3).toUpperCase(),
      description: dto.description?.trim(),
      linkedItemIds: dto.linkedItemIds || [],
    };

    groups.push(newGroup);
    orgGroupsStore.set(orgId, groups);

    if (newGroup.linkedItemIds && newGroup.linkedItemIds.length > 0) {
      const items = orgItemsStore.get(orgId) || [];
      for (const item of items) {
        if (newGroup.linkedItemIds.includes(item.id)) {
          item.applicableGroupIds = Array.from(new Set([...(item.applicableGroupIds || []), newGroup.id]));
        }
      }
      orgItemsStore.set(orgId, items);
    }

    return { success: true, group: newGroup };
  }

  // Link / Assign fee items to a cohort group
  @Post('billing/groups/:id/link-items')
  @UseGuards(ClerkAuthGuard)
  linkGroupItems(
    @CurrentUser() user: ClerkUserContext,
    @Param('id') groupId: string,
    @Body() dto: { itemIds: string[] },
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const groups = orgGroupsStore.get(orgId) || [];
    const group = groups.find((g) => g.id === groupId);
    if (!group) throw new NotFoundException('Group not found');

    const itemIds = Array.isArray(dto.itemIds) ? dto.itemIds : [];
    group.linkedItemIds = itemIds;

    const items = orgItemsStore.get(orgId) || [];
    for (const item of items) {
      const shouldInclude = itemIds.includes(item.id);
      const currentGroups = item.applicableGroupIds || [];
      if (shouldInclude) {
        if (!currentGroups.includes(groupId)) {
          item.applicableGroupIds = [...currentGroups, groupId];
        }
      } else {
        item.applicableGroupIds = currentGroups.filter((gid) => gid !== groupId);
      }
    }
    orgItemsStore.set(orgId, items);
    orgGroupsStore.set(orgId, groups);

    return { success: true, group, items };
  }

  @Delete('billing/groups/:id')
  @UseGuards(ClerkAuthGuard)
  deleteGroup(
    @CurrentUser() user: ClerkUserContext,
    @Param('id') groupId: string,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const groups = (orgGroupsStore.get(orgId) || []).filter((g) => g.id !== groupId);
    orgGroupsStore.set(orgId, groups);

    // Clean up applicableGroupIds from items
    const items = orgItemsStore.get(orgId) || [];
    for (const it of items) {
      if (it.applicableGroupIds) {
        it.applicableGroupIds = it.applicableGroupIds.filter((gid) => gid !== groupId);
      }
    }
    orgItemsStore.set(orgId, items);

    return { success: true };
  }

  // --- BILLING ITEMS (FEE CATALOG) ---
  @Post('billing/items')
  @UseGuards(ClerkAuthGuard)
  createItem(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: { name: string; category?: string; defaultAmountMinor: number; applicableGroupIds?: string[] },
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    if (!dto.name) throw new BadRequestException('Item name is required');

    const items = orgItemsStore.get(orgId) || [];
    const newItem: BillingItem = {
      id: `item_${Date.now()}`,
      name: dto.name.trim(),
      category: dto.category?.trim() || 'General',
      defaultAmountMinor: Number(dto.defaultAmountMinor) || 0,
      applicableGroupIds: dto.applicableGroupIds || [],
    };

    items.push(newItem);
    orgItemsStore.set(orgId, items);

    if (newItem.applicableGroupIds && newItem.applicableGroupIds.length > 0) {
      const groups = orgGroupsStore.get(orgId) || [];
      for (const group of groups) {
        if (newItem.applicableGroupIds.includes(group.id)) {
          group.linkedItemIds = Array.from(new Set([...(group.linkedItemIds || []), newItem.id]));
        }
      }
      orgGroupsStore.set(orgId, groups);
    }

    return { success: true, item: newItem };
  }

  @Patch('billing/items/:id')
  @UseGuards(ClerkAuthGuard)
  updateItem(
    @CurrentUser() user: ClerkUserContext,
    @Param('id') itemId: string,
    @Body() dto: { name?: string; category?: string; defaultAmountMinor?: number; applicableGroupIds?: string[] },
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const items = orgItemsStore.get(orgId) || [];
    const item = items.find((it) => it.id === itemId);
    if (!item) throw new NotFoundException('Item not found');

    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.category !== undefined) item.category = dto.category.trim();
    if (dto.defaultAmountMinor !== undefined) item.defaultAmountMinor = Number(dto.defaultAmountMinor) || 0;
    if (dto.applicableGroupIds !== undefined) {
      item.applicableGroupIds = dto.applicableGroupIds;

      const groups = orgGroupsStore.get(orgId) || [];
      for (const group of groups) {
        const isLinked = item.applicableGroupIds.includes(group.id);
        const currentLinks = group.linkedItemIds || [];
        if (isLinked) {
          if (!currentLinks.includes(item.id)) {
            group.linkedItemIds = [...currentLinks, item.id];
          }
        } else {
          group.linkedItemIds = currentLinks.filter((id) => id !== item.id);
        }
      }
      orgGroupsStore.set(orgId, groups);
    }

    orgItemsStore.set(orgId, items);
    return { success: true, item };
  }

  @Delete('billing/items/:id')
  @UseGuards(ClerkAuthGuard)
  deleteItem(
    @CurrentUser() user: ClerkUserContext,
    @Param('id') itemId: string,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const items = (orgItemsStore.get(orgId) || []).filter((item) => item.id !== itemId);
    orgItemsStore.set(orgId, items);

    // Clean up from groups
    const groups = orgGroupsStore.get(orgId) || [];
    for (const g of groups) {
      if (g.linkedItemIds) {
        g.linkedItemIds = g.linkedItemIds.filter((id) => id !== itemId);
      }
    }
    orgGroupsStore.set(orgId, groups);

    return { success: true };
  }

  // --- PAYERS (STUDENTS, PATIENTS, CUSTOMERS) ---
  @Post('billing/payers')
  @UseGuards(ClerkAuthGuard)
  createPayer(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: { name: string; identifier: string; groupId: string; email?: string; phone?: string },
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    if (!dto.name || !dto.identifier) {
      throw new BadRequestException('Payer name and identifier are required');
    }

    const payers = orgPayersStore.get(orgId) || [];
    const newPayer: Payer = {
      id: `pyr_${Date.now()}`,
      name: dto.name.trim(),
      identifier: dto.identifier.trim(),
      groupId: dto.groupId,
      email: dto.email?.trim(),
      phone: dto.phone?.trim(),
    };

    payers.push(newPayer);
    orgPayersStore.set(orgId, payers);

    return { success: true, payer: newPayer };
  }

  @Delete('billing/payers/:id')
  @UseGuards(ClerkAuthGuard)
  deletePayer(
    @CurrentUser() user: ClerkUserContext,
    @Param('id') payerId: string,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const payers = (orgPayersStore.get(orgId) || []).filter((p) => p.id !== payerId);
    orgPayersStore.set(orgId, payers);
    return { success: true };
  }

  // --- INVOICES / BILLS ---
  @Get('bills')
  @UseGuards(ClerkAuthGuard)
  getBills(
    @CurrentUser() user: ClerkUserContext,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    if (!orgBillsStore.has(orgId)) {
      seedOrgData(orgId, 'SCHOOL');
    }
    const bills = orgBillsStore.get(orgId) || [];
    return {
      bills,
      totalCount: bills.length,
      orgId,
    };
  }

  // Create single invoice
  @Post('bills')
  @UseGuards(ClerkAuthGuard)
  async createBill(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: {
      payerName: string;
      payerId?: string;
      payerEmail?: string;
      groupId?: string;
      items: BillItemLine[];
      currency?: string;
      dueDate?: string;
      sendEmail?: boolean;
    },
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    if (!dto.payerName) throw new BadRequestException('Payer name is required');
    if (!dto.items || dto.items.length === 0) throw new BadRequestException('At least one bill item is required');

    const totalAmountMinor = dto.items.reduce((sum, item) => sum + (Number(item.amountMinor) || 0), 0);
    const groups = orgGroupsStore.get(orgId) || [];
    const group = groups.find((g) => g.id === dto.groupId);

    const payers = orgPayersStore.get(orgId) || [];
    const payer = dto.payerId ? payers.find((p) => p.id === dto.payerId) : undefined;
    const recipientEmail = dto.payerEmail?.trim() || payer?.email;

    const token = `tok_${crypto.randomBytes(8).toString('hex')}`;
    const newBill: Bill = {
      id: `bill_${Date.now()}`,
      orgId,
      token,
      payerId: dto.payerId,
      payerName: dto.payerName.trim(),
      payerEmail: recipientEmail,
      groupId: dto.groupId,
      groupName: group?.name || 'General',
      items: dto.items,
      totalAmountMinor,
      currency: dto.currency || 'NGN',
      status: BillStatus.ISSUED,
      dueDate: dto.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    if (dto.sendEmail && recipientEmail) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      await invoiceNotificationService.sendInvoiceEmail(newBill, orgId, recipientEmail, clientUrl);
      newBill.sentAt = new Date().toISOString();
      newBill.sentCount = 1;
    }

    const bills = orgBillsStore.get(orgId) || [];
    bills.unshift(newBill);
    orgBillsStore.set(orgId, bills);

    return {
      success: true,
      bill: newBill,
      publicUrl: `/pay/${token}`,
    };
  }

  // Batch generate bills for an entire cohort / group (e.g. All Grade 1 students)
  @Post('bills/batch')
  @UseGuards(ClerkAuthGuard)
  async batchGenerateBills(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: {
      groupId: string;
      itemIds: string[];
      dueDate?: string;
      currency?: string;
      sendEmails?: boolean;
    },
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    if (!dto.groupId) throw new BadRequestException('Group ID is required');

    const payers = (orgPayersStore.get(orgId) || []).filter((p) => p.groupId === dto.groupId);
    if (payers.length === 0) {
      throw new BadRequestException('No payers found in the selected group');
    }

    const catalog = orgItemsStore.get(orgId) || [];
    const selectedItems = catalog.filter((item) => dto.itemIds.includes(item.id));
    if (selectedItems.length === 0) {
      throw new BadRequestException('At least one valid catalog item must be selected');
    }

    const groups = orgGroupsStore.get(orgId) || [];
    const group = groups.find((g) => g.id === dto.groupId);
    const groupName = group?.name || 'Selected Group';

    const billItems: BillItemLine[] = selectedItems.map((item) => {
      // Resolve custom cohort price if configured, otherwise fallback to default amount
      const resolvedAmount =
        group?.customItemPrices?.[item.id] !== undefined
          ? group.customItemPrices[item.id]
          : item.groupPrices?.[dto.groupId] !== undefined
          ? item.groupPrices[dto.groupId]
          : item.defaultAmountMinor;

      return {
        itemId: item.id,
        description: item.name,
        amountMinor: resolvedAmount,
      };
    });
    const totalAmountMinor = billItems.reduce((sum, item) => sum + item.amountMinor, 0);

    const generatedBills: Bill[] = [];
    const existingBills = orgBillsStore.get(orgId) || [];
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    for (const payer of payers) {
      const token = `tok_${crypto.randomBytes(8).toString('hex')}`;
      const bill: Bill = {
        id: `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        orgId,
        token,
        payerId: payer.id,
        payerName: `${payer.name} (${payer.identifier})`,
        payerEmail: payer.email,
        groupId: payer.groupId,
        groupName,
        items: billItems,
        totalAmountMinor,
        currency: dto.currency || 'NGN',
        status: BillStatus.ISSUED,
        dueDate: dto.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      if (dto.sendEmails && payer.email) {
        await invoiceNotificationService.sendInvoiceEmail(bill, orgId, payer.email, clientUrl);
        bill.sentAt = new Date().toISOString();
        bill.sentCount = 1;
      }

      generatedBills.push(bill);
    }

    const updatedBills = [...generatedBills, ...existingBills];
    orgBillsStore.set(orgId, updatedBills);

    return {
      success: true,
      count: generatedBills.length,
      bills: generatedBills,
    };
  }

  // Mark bill as settled / paid
  @Post('bills/:id/pay')
  @UseGuards(ClerkAuthGuard)
  markBillPaid(
    @CurrentUser() user: ClerkUserContext,
    @Param('id') billId: string,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const bills = orgBillsStore.get(orgId) || [];
    const bill = bills.find((b) => b.id === billId);
    if (!bill) throw new NotFoundException('Bill not found');

    bill.status = BillStatus.PAID;
    bill.paidAt = new Date().toISOString();

    return {
      success: true,
      bill,
    };
  }

  // Send invoice email to enrolled payer
  @Post('bills/:id/send')
  @UseGuards(ClerkAuthGuard)
  async sendInvoiceEmail(
    @CurrentUser() user: ClerkUserContext,
    @Param('id') billId: string,
    @Body('email') targetEmail?: string,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const bills = orgBillsStore.get(orgId) || [];
    const bill = bills.find((b) => b.id === billId);
    if (!bill) throw new NotFoundException('Bill not found');

    const payers = orgPayersStore.get(orgId) || [];
    const payer = payers.find((p) => p.id === bill.payerId);
    const recipientEmail = targetEmail?.trim() || bill.payerEmail || payer?.email;

    if (!recipientEmail) {
      throw new BadRequestException('Recipient email address is required to dispatch this invoice');
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const result = await invoiceNotificationService.sendInvoiceEmail(bill, orgId, recipientEmail, clientUrl);

    bill.payerEmail = recipientEmail;
    bill.sentAt = new Date().toISOString();
    bill.sentCount = (bill.sentCount || 0) + 1;

    return {
      success: true,
      message: `Invoice dispatched to ${recipientEmail}`,
      bill,
      deliveredTo: recipientEmail,
      provider: result.provider,
      dispatch: result,
    };
  }

  // Preview rendered HTML invoice email
  @Get('bills/:id/email-preview')
  @UseGuards(ClerkAuthGuard)
  previewInvoiceEmail(
    @CurrentUser() user: ClerkUserContext,
    @Param('id') billId: string,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const bills = orgBillsStore.get(orgId) || [];
    const bill = bills.find((b) => b.id === billId);
    if (!bill) throw new NotFoundException('Bill not found');

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const emailData = invoiceNotificationService.generateInvoiceEmail(bill, orgId, clientUrl);

    return {
      success: true,
      ...emailData,
    };
  }

  // Get Korapay Configuration status
  @Get('billing/kora-config')
  @UseGuards(ClerkAuthGuard)
  getKoraConfig(
    @CurrentUser() user: ClerkUserContext,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const tenantConfig = orgKoraConfigStore.get(orgId);
    const secretKey = process.env.KORA_SECRET_KEY || tenantConfig?.secretKey;
    const publicKey = process.env.KORA_PUBLIC_KEY || tenantConfig?.publicKey;
    const webhookSecret = process.env.KORA_WEBHOOK_SECRET || tenantConfig?.webhookSecret;

    return {
      isConfigured: !!secretKey,
      hasSecretKey: !!secretKey,
      publicKey: publicKey ? `${publicKey.substring(0, 10)}...` : '',
      webhookSecretConfigured: !!webhookSecret,
      envSource: !!process.env.KORA_SECRET_KEY,
    };
  }

  // Save Korapay API keys for organization
  @Post('billing/kora-config')
  @UseGuards(ClerkAuthGuard)
  saveKoraConfig(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: { secretKey: string; publicKey?: string; webhookSecret?: string },
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    if (!dto.secretKey) throw new BadRequestException('Korapay Secret Key is required');

    orgKoraConfigStore.set(orgId, {
      secretKey: dto.secretKey.trim(),
      publicKey: dto.publicKey?.trim(),
      webhookSecret: dto.webhookSecret?.trim(),
    });

    return {
      success: true,
      message: 'Korapay credentials saved successfully for this organization',
    };
  }

  // Public bill lookup route
  @Get('public/bills/:token')
  @Public()
  getPublicBill(@Param('token') token: string) {
    let matchedBill: Bill | undefined;
    for (const bills of orgBillsStore.values()) {
      const found = bills.find((b) => b.token === token);
      if (found) {
        matchedBill = found;
        break;
      }
    }

    if (!matchedBill) {
      throw new NotFoundException('Payment token invalid or expired');
    }

    return {
      id: matchedBill.id,
      token: matchedBill.token,
      orgId: matchedBill.orgId,
      payerName: matchedBill.payerName,
      payerEmail: matchedBill.payerEmail,
      groupName: matchedBill.groupName,
      items: matchedBill.items,
      amountMinor: matchedBill.totalAmountMinor,
      currency: matchedBill.currency,
      dueDate: matchedBill.dueDate,
      status: matchedBill.status,
      paidAt: matchedBill.paidAt,
      sentAt: matchedBill.sentAt,
      koraReference: matchedBill.koraReference,
      koraCheckoutUrl: matchedBill.koraCheckoutUrl,
    };
  }

  // Initiate Korapay charge for public invoice
  @Post('public/bills/:token/checkout/kora')
  @Public()
  async initKoraCheckout(
    @Param('token') token: string,
    @Body() dto?: { redirectUrl?: string }
  ) {
    let matchedBill: Bill | undefined;
    for (const bills of orgBillsStore.values()) {
      const found = bills.find((b) => b.token === token);
      if (found) {
        matchedBill = found;
        break;
      }
    }

    if (!matchedBill) {
      throw new NotFoundException('Payment token invalid or expired');
    }

    if (matchedBill.status === BillStatus.PAID) {
      throw new BadRequestException('This invoice is already settled');
    }

    const tenantConfig = orgKoraConfigStore.get(matchedBill.orgId);
    const secretKey = process.env.KORA_SECRET_KEY || tenantConfig?.secretKey;
    const publicKey = process.env.KORA_PUBLIC_KEY || tenantConfig?.publicKey;
    const baseUrl = process.env.KORA_BASE_URL || 'https://api.korapay.com/merchant/api/v1';

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const redirectUrl = dto?.redirectUrl || `${clientUrl}/pay/${matchedBill.token}?kora_return=true`;

    if (secretKey) {
      try {
        const gateway = new KoraGateway({ secretKey, publicKey, baseUrl });
        const charge = await gateway.initializeCharge({
          reference: `inv_${matchedBill.token}_${Date.now()}`,
          amountMinor: matchedBill.totalAmountMinor,
          currency: (matchedBill.currency || 'NGN') as SupportedCurrency,
          customer: {
            name: matchedBill.payerName,
            email: matchedBill.payerEmail || `${matchedBill.token}@antigravity.payer`,
          },
          redirectUrl,
          metadata: {
            billToken: matchedBill.token,
            billId: matchedBill.id,
            orgId: matchedBill.orgId,
          },
        });

        matchedBill.koraReference = charge.reference;
        matchedBill.koraCheckoutUrl = charge.checkoutUrl;

        return {
          success: true,
          checkoutUrl: charge.checkoutUrl,
          reference: charge.reference,
          isLiveKora: true,
        };
      } catch (err: any) {
        console.error('[KoraGateway] Charge init failed:', err.message);
        throw new BadRequestException(`Korapay checkout initiation failed: ${err.message}`);
      }
    }

    // Sandbox / demo mode fallback when API key is not yet configured
    const fallbackRef = `inv_demo_${matchedBill.token}_${Date.now()}`;
    matchedBill.koraReference = fallbackRef;
    return {
      success: true,
      checkoutUrl: `/pay/${matchedBill.token}?kora_demo=true&ref=${fallbackRef}`,
      reference: fallbackRef,
      isLiveKora: false,
      message: 'Korapay API key not configured yet. Running in sandbox checkout demo.',
    };
  }

  // Verify Korapay payment upon return
  @Get('public/bills/:token/verify-kora')
  @Public()
  async verifyKoraPayment(
    @Param('token') token: string,
    @Query('reference') reference?: string
  ) {
    let matchedBill: Bill | undefined;
    for (const bills of orgBillsStore.values()) {
      const found = bills.find((b) => b.token === token);
      if (found) {
        matchedBill = found;
        break;
      }
    }

    if (!matchedBill) {
      throw new NotFoundException('Payment token invalid or expired');
    }

    if (matchedBill.status === BillStatus.PAID) {
      return { success: true, status: 'PAID', bill: matchedBill };
    }

    const ref = reference || matchedBill.koraReference;
    const tenantConfig = orgKoraConfigStore.get(matchedBill.orgId);
    const secretKey = process.env.KORA_SECRET_KEY || tenantConfig?.secretKey;

    if (secretKey && ref) {
      try {
        const gateway = new KoraGateway({ secretKey });
        const charge = await gateway.getCharge(ref);

        if (charge.status === PaymentStatus.SUCCESS) {
          matchedBill.status = BillStatus.PAID;
          matchedBill.paidAt = (charge.paidAt || new Date()).toISOString();
          return { success: true, status: 'PAID', bill: matchedBill };
        }
      } catch (err: any) {
        console.warn('[KoraGateway] Verification query failed:', err.message);
      }
    } else if (ref && ref.startsWith('inv_demo_')) {
      matchedBill.status = BillStatus.PAID;
      matchedBill.paidAt = new Date().toISOString();
      return { success: true, status: 'PAID', bill: matchedBill };
    }

    return {
      success: false,
      status: matchedBill.status,
      bill: matchedBill,
    };
  }

  // Korapay Webhook for automatic settlement
  @Post('public/webhook/kora')
  @Public()
  handleKoraWebhook(@Body() payload: any) {
    const event = payload?.event;
    const data = payload?.data;

    if (event === 'charge.success' || data?.status === 'success' || data?.status === 'successful') {
      const token = data?.metadata?.billToken;
      const ref = data?.reference;

      let targetBill: Bill | undefined;
      for (const bills of orgBillsStore.values()) {
        const found = bills.find((b) => (token && b.token === token) || (ref && b.koraReference === ref));
        if (found) {
          targetBill = found;
          break;
        }
      }

      if (targetBill) {
        targetBill.status = BillStatus.PAID;
        targetBill.paidAt = new Date().toISOString();
        console.log(`[KoraWebhook] Invoice settled via Kora webhook: ${targetBill.token} (${targetBill.payerName})`);
      }
    }

    return { status: 'success' };
  }

  // Alias webhook under billing route
  @Post('billing/webhook/kora')
  @Public()
  handleBillingKoraWebhook(@Body() payload: any) {
    return this.handleKoraWebhook(payload);
  }

  // Public bill payment fallback route
  @Post('public/bills/:token/pay')
  @Public()
  payPublicBill(
    @Param('token') token: string,
    @Body() _dto?: { paymentMethod?: string }
  ) {
    let matchedBill: Bill | undefined;
    for (const bills of orgBillsStore.values()) {
      const found = bills.find((b) => b.token === token);
      if (found) {
        matchedBill = found;
        break;
      }
    }

    if (!matchedBill) {
      throw new NotFoundException('Payment token invalid or expired');
    }

    matchedBill.status = BillStatus.PAID;
    matchedBill.paidAt = new Date().toISOString();

    return {
      success: true,
      message: 'Payment processed and settled successfully',
      bill: matchedBill,
    };
  }
}
