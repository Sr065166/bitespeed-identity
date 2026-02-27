import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function identifyHandler(req: Request, res: Response) {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'email or phoneNumber required' });
  }

  const matchingContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        email ? { email } : {},
        phoneNumber ? { phoneNumber: String(phoneNumber) } : {},
      ].filter(c => Object.keys(c).length > 0),
    },
    orderBy: { createdAt: 'asc' },
  });

  if (matchingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber ? String(phoneNumber) : null,
        linkPrecedence: 'primary',
      },
    });

    return res.status(200).json({
      contact: {
        primaryContatctId: newContact.id,
        emails: newContact.email ? [newContact.email] : [],
        phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
        secondaryContactIds: [],
      },
    });
  }

  const primaryIds = new Set<number>();
  for (const contact of matchingContacts) {
    if (contact.linkPrecedence === 'primary') {
      primaryIds.add(contact.id);
    } else if (contact.linkedId) {
      primaryIds.add(contact.linkedId);
    }
  }

  let allClusterContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: { in: Array.from(primaryIds) } },
        { linkedId: { in: Array.from(primaryIds) } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  const primaries = allClusterContacts.filter(c => c.linkPrecedence === 'primary');
  primaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const truePrimary = primaries[0];

  if (primaries.length > 1) {
    const todemote = primaries.slice(1);
    for (const contact of todemote) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          linkPrecedence: 'secondary',
          linkedId: truePrimary.id,
          updatedAt: new Date(),
        },
      });
    }

    const demotedIds = todemote.map(c => c.id);
    await prisma.contact.updateMany({
      where: {
        linkedId: { in: demotedIds },
        deletedAt: null,
      },
      data: { linkedId: truePrimary.id },
    });

    allClusterContacts = await prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: [
          { id: truePrimary.id },
          { linkedId: truePrimary.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  const allEmails = allClusterContacts.map(c => c.email).filter(Boolean);
  const allPhones = allClusterContacts.map(c => c.phoneNumber).filter(Boolean);

  const emailIsNew = email && !allEmails.includes(email);
  const phoneIsNew = phoneNumber && !allPhones.includes(String(phoneNumber));

  if (emailIsNew || phoneIsNew) {
    await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber ? String(phoneNumber) : null,
        linkedId: truePrimary.id,
        linkPrecedence: 'secondary',
      },
    });

    allClusterContacts = await prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: [
          { id: truePrimary.id },
          { linkedId: truePrimary.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  const secondaryContacts = allClusterContacts.filter(c => c.id !== truePrimary.id);

  const emails: string[] = [];
  const phoneNumbers: string[] = [];

  if (truePrimary.email) emails.push(truePrimary.email);
  if (truePrimary.phoneNumber) phoneNumbers.push(truePrimary.phoneNumber);

  for (const c of secondaryContacts) {
    if (c.email && !emails.includes(c.email)) emails.push(c.email);
    if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber)) phoneNumbers.push(c.phoneNumber);
  }

  return res.status(200).json({
    contact: {
      primaryContatctId: truePrimary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaryContacts.map(c => c.id),
    },
  });
}