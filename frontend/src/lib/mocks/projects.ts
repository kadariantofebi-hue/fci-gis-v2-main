import type { Project, ProjectAssetLink, ProjectDocument, ProjectDocumentFile, ProjectMember, ProjectMilestone, ProjectPayment } from '$shared/schemas/project';
import { ACTIVE_OPD } from './opd';

const opdId = ACTIVE_OPD.id;
const opdName = ACTIVE_OPD.shortName;

export const projects: Project[] = [
 {id:'prj-001',projectCode:'GIS-2026-001',projectName:'Pemetaan Aset Jalan dan Saluran Koridor Utara',fiscalYear:2026,opdId,opdName,vendorName:'PT Geo Nusantara',contractNumber:'027/421/SPK-GIS/2026',contractValue:1450000000,startDate:'2026-02-01',endDate:'2026-07-30',status:'in_progress',version:2,description:'Survey, digitasi, dan validasi layer jalan/saluran prioritas.',documentSummary:{total:5,verified:2,sensitive:2},paymentSummary:{invoiceTotal:435000000,paidTotal:250000000,terms:3},jenisInfrastruktur:'jalan',geometry:{type:'LineString',coordinates:[[112.68,-7.50],[112.72,-7.51],[112.76,-7.52],[112.80,-7.53],[112.84,-7.54]]},district:'Sidoarjo',roadName:'Koridor Utara',skProyek:'SK.050/118/438.5.2/2026'},
 {id:'prj-002',projectCode:'GIS-2026-002',projectName:'Inventarisasi Lahan Pemerintah Wilayah Selatan',fiscalYear:2026,opdId,opdName,vendorName:'CV Kartografi Timur',contractNumber:'028/119/KONTRAK/2026',contractValue:920000000,startDate:'2026-03-15',endDate:'2026-09-01',status:'procurement',version:1,description:'Inventarisasi lahan dan dokumen legal untuk audit aset.',documentSummary:{total:4,verified:1,sensitive:1},paymentSummary:{invoiceTotal:0,paidTotal:0,terms:2},jenisInfrastruktur:'lapangan',geometry:{type:'Polygon',coordinates:[[[112.72,-7.78],[112.76,-7.78],[112.76,-7.82],[112.72,-7.82],[112.72,-7.78]]]},district:'Sidoarjo',roadName:'Jl. Raya Buduran No. 12',rt:'03',rw:'02',kelurahan:'Buduran',kecamatan:'Buduran',skProyek:'SK.050/142/438.5.2/2026'},
 {id:'prj-003',projectCode:'GIS-2025-014',projectName:'Migrasi Data Aset Pendidikan ke SIMANTA',fiscalYear:2025,opdId,opdName,vendorName:'PT Integrasi Data Mandiri',contractNumber:'420/882/PKS/2025',contractValue:780000000,startDate:'2025-08-01',endDate:'2025-12-15',status:'completed',version:5,description:'Migrasi spreadsheet lama, geocoding, dan quality check bangunan sekolah.',documentSummary:{total:4,verified:4,sensitive:1},paymentSummary:{invoiceTotal:780000000,paidTotal:780000000,terms:2},jenisInfrastruktur:'bangunan',geometry:{type:'Point',coordinates:[112.75,-7.65]},district:'Sidoarjo',roadName:'Aset Pendidikan',skProyek:'SK.420/215/438.5.1/2025'}
];

export const projectMembers: ProjectMember[] = [
 {id:'pm-1',projectId:'prj-001',userId:'u-admin',memberRole:'owner',assignedAt:'2026-02-01T08:00:00Z'},
 {id:'pm-2',projectId:'prj-001',userId:'u-auditor',memberRole:'reviewer',assignedAt:'2026-02-05T08:00:00Z'}
];

const baseDocs = [
 ['kak_tor','planning','KAK/TOR',false,'verified'],
 ['hps','planning','HPS',true,'submitted'],
 ['contract','contract','Kontrak',true,'verified'],
 ['progress_report','implementation','Laporan progres',false,'incomplete'],
 ['invoice','payment','Invoice termin',true,'submitted']
] as const;

export const documents: ProjectDocument[] = projects.flatMap((p,pi)=>baseDocs.map(([kind,stage,title,isSensitive,status],i)=>({
 id:`doc-${pi+1}-${i+1}`, projectId:p.id, stage, kind, documentNumber:`${p.projectCode}/${String(i+1).padStart(2,'0')}`, documentDate:`2026-${String(Math.min(12,i+1)).padStart(2,'0')}-10`, title, description:`Header metadata ${title} sesuai PRD v1.3.7`, isSensitive, verificationStatus:status, version:i+1, createdBy:'Admin Dokumen', createdAt:'2026-05-10T08:00:00Z', updatedAt:'2026-05-10T08:00:00Z'
})));

export const documentFiles: ProjectDocumentFile[] = [
 {id:'file-1-1-a',projectId:'prj-001',documentId:'doc-1-1',fileLabel:'dokumen_utama',fileOrder:1,fileVersion:1,filename:'kak_tor_GIS-2026-001.pdf',originalFilename:'kak_tor_GIS-2026-001.pdf',mimeType:'application/pdf',sizeBytes:384000,isActive:true,scanStatus:'clean',checksumSha256:'sha256:prj-001-kak_tor-main',uploadedBy:'Admin Dokumen',uploadedAt:'2026-05-10T08:00:00Z',version:1},
 {id:'file-1-2-a',projectId:'prj-001',documentId:'doc-1-2',fileLabel:'dokumen_utama',fileOrder:1,fileVersion:1,filename:'hps_rahasia_GIS-2026-001.pdf',originalFilename:'hps_rahasia_GIS-2026-001.pdf',mimeType:'application/pdf',sizeBytes:512000,isActive:true,scanStatus:'clean',checksumSha256:'sha256:prj-001-hps-main',uploadedBy:'Admin Dokumen',uploadedAt:'2026-05-11T08:00:00Z',version:2},
 {id:'file-1-2-b',projectId:'prj-001',documentId:'doc-1-2',fileLabel:'lampiran',fileOrder:2,fileVersion:1,filename:'lampiran_hps_GIS-2026-001.xlsx',originalFilename:'lampiran_hps_GIS-2026-001.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',sizeBytes:128000,isActive:true,scanStatus:'pending',checksumSha256:'sha256:prj-001-hps-lampiran',uploadedBy:'Admin Dokumen',uploadedAt:'2026-05-11T09:00:00Z',version:1},
 {id:'file-1-3-a',projectId:'prj-001',documentId:'doc-1-3',fileLabel:'dokumen_utama',fileOrder:1,fileVersion:1,filename:'kontrak_GIS-2026-001.pdf',originalFilename:'kontrak_GIS-2026-001.pdf',mimeType:'application/pdf',sizeBytes:760000,isActive:true,scanStatus:'blocked',checksumSha256:'sha256:prj-001-contract-blocked',uploadedBy:'Admin Dokumen',uploadedAt:'2026-05-12T08:00:00Z',version:1},
 {id:'file-1-3-b',projectId:'prj-001',documentId:'doc-1-3',fileLabel:'revisi',fileOrder:2,fileVersion:1,filename:'kontrak_GIS-2026-001_clean-scan.pdf',originalFilename:'kontrak_GIS-2026-001_clean-scan.pdf',mimeType:'application/pdf',sizeBytes:762000,isActive:true,scanStatus:'clean',checksumSha256:'sha256:prj-001-contract-clean',uploadedBy:'Admin Dokumen',uploadedAt:'2026-05-12T10:00:00Z',version:1},
 {id:'file-1-5-a',projectId:'prj-001',documentId:'doc-1-5',fileLabel:'dokumen_utama',fileOrder:1,fileVersion:1,filename:'invoice_termin_GIS-2026-001.pdf',originalFilename:'invoice_termin_GIS-2026-001.pdf',mimeType:'application/pdf',sizeBytes:220000,isActive:true,scanStatus:'pending',checksumSha256:'sha256:prj-001-invoice-pending',uploadedBy:'Admin Dokumen',uploadedAt:'2026-06-02T08:00:00Z',version:1},
 {id:'file-2-2-a',projectId:'prj-002',documentId:'doc-2-2',fileLabel:'dokumen_utama',fileOrder:1,fileVersion:1,filename:'hps_rahasia_GIS-2026-002.pdf',originalFilename:'hps_rahasia_GIS-2026-002.pdf',mimeType:'application/pdf',sizeBytes:420000,isActive:true,scanStatus:'pending',checksumSha256:'sha256:prj-002-hps-pending',uploadedBy:'Admin Dokumen',uploadedAt:'2026-05-11T08:00:00Z',version:1},
 {id:'file-2-5-a',projectId:'prj-002',documentId:'doc-2-5',fileLabel:'dokumen_utama',fileOrder:1,fileVersion:1,filename:'invoice_termin_GIS-2026-002.pdf',originalFilename:'invoice_termin_GIS-2026-002.pdf',mimeType:'application/pdf',sizeBytes:180000,isActive:true,scanStatus:'pending',checksumSha256:'sha256:prj-002-invoice-pending',uploadedBy:'Admin Dokumen',uploadedAt:'2026-06-02T08:00:00Z',version:1},
 {id:'file-3-2-a',projectId:'prj-003',documentId:'doc-3-2',fileLabel:'dokumen_utama',fileOrder:1,fileVersion:1,filename:'hps_rahasia_GIS-2025-014.pdf',originalFilename:'hps_rahasia_GIS-2025-014.pdf',mimeType:'application/pdf',sizeBytes:390000,isActive:true,scanStatus:'pending',checksumSha256:'sha256:prj-003-hps-pending',uploadedBy:'Admin Dokumen',uploadedAt:'2025-08-02T08:00:00Z',version:1},
 {id:'file-2-1-a',projectId:'prj-002',documentId:'doc-2-1',fileLabel:'dokumen_utama',fileOrder:1,fileVersion:1,filename:'kak_tor_GIS-2026-002.pdf',originalFilename:'kak_tor_GIS-2026-002.pdf',mimeType:'application/pdf',sizeBytes:300000,isActive:true,scanStatus:'clean',checksumSha256:'sha256:prj-002-kak_tor-main',uploadedBy:'Admin Dokumen',uploadedAt:'2026-05-10T08:00:00Z',version:1},
 {id:'file-2-3-a',projectId:'prj-002',documentId:'doc-2-3',fileLabel:'dokumen_utama',fileOrder:1,fileVersion:1,filename:'kontrak_GIS-2026-002.pdf',originalFilename:'kontrak_GIS-2026-002.pdf',mimeType:'application/pdf',sizeBytes:650000,isActive:true,scanStatus:'clean',checksumSha256:'sha256:prj-002-contract-main',uploadedBy:'Admin Dokumen',uploadedAt:'2026-05-12T08:00:00Z',version:1},
 {id:'file-3-1-a',projectId:'prj-003',documentId:'doc-3-1',fileLabel:'dokumen_utama',fileOrder:1,fileVersion:1,filename:'kak_tor_GIS-2025-014.pdf',originalFilename:'kak_tor_GIS-2025-014.pdf',mimeType:'application/pdf',sizeBytes:240000,isActive:true,scanStatus:'clean',checksumSha256:'sha256:prj-003-kak',uploadedBy:'Admin Dokumen',uploadedAt:'2025-08-01T08:00:00Z',version:1},
 {id:'file-3-3-a',projectId:'prj-003',documentId:'doc-3-3',fileLabel:'dokumen_utama',fileOrder:1,fileVersion:1,filename:'kontrak_GIS-2025-014.pdf',originalFilename:'kontrak_GIS-2025-014.pdf',mimeType:'application/pdf',sizeBytes:700000,isActive:true,scanStatus:'clean',checksumSha256:'sha256:prj-003-contract-main',uploadedBy:'Admin Dokumen',uploadedAt:'2025-08-15T08:00:00Z',version:1},
 {id:'file-3-5-a',projectId:'prj-003',documentId:'doc-3-5',fileLabel:'bukti_pendukung',fileOrder:1,fileVersion:1,filename:'sp2d_final_GIS-2025-014.pdf',originalFilename:'sp2d_final_GIS-2025-014.pdf',mimeType:'application/pdf',sizeBytes:410000,isActive:true,scanStatus:'clean',checksumSha256:'sha256:prj-003-sp2d',uploadedBy:'Auditor',uploadedAt:'2025-12-28T08:00:00Z',version:1}
];

export const milestones: ProjectMilestone[] = projects.flatMap((p)=>[
 {id:`ms-${p.id}-1`,projectId:p.id,name:'KAK/TOR disetujui',plannedDate:p.startDate,actualDate:p.startDate,notes:'Dokumen perencanaan awal disetujui'},
 {id:`ms-${p.id}-2`,projectId:p.id,name:'Kontrak/SPMK',plannedDate:'2026-03-01',actualDate:p.status==='procurement'?undefined:'2026-03-01',notes:'Referensi kontrak/SPMK proyek GIS'},
 {id:`ms-${p.id}-3`,projectId:p.id,name:'UAT dan BAST final',plannedDate:p.endDate,actualDate:p.status==='completed'?p.endDate:undefined,notes:'Target serah terima hasil Administrasi Proyek GIS'}
]);
export const payments: ProjectPayment[] = [
 {id:'pay-1',projectId:'prj-001',paymentTerm:'Termin 1 - Mobilisasi',invoiceNumber:'INV-GEO-001/2026',invoiceDate:'2026-04-12',invoiceValue:250000000,sp2dNumber:'SP2D/LS/2026/00401',sp2dDate:'2026-04-25',paymentStatus:'paid',documentId:'doc-1-5',metadata:{source:'mock_reference'}},
 {id:'pay-2',projectId:'prj-001',paymentTerm:'Termin 2 - Progres 60%',invoiceNumber:'INV-GEO-002/2026',invoiceDate:'2026-06-02',invoiceValue:185000000,sp2dNumber:'SP2D/LS/2026/00680',sp2dDate:'2026-06-12',paymentStatus:'verified',documentId:'doc-1-5',metadata:{source:'mock_reference'}},
 {id:'pay-3',projectId:'prj-003',paymentTerm:'Final 100%',invoiceNumber:'INV-IDM-014/2025',invoiceDate:'2025-12-20',invoiceValue:780000000,sp2dNumber:'SP2D/LS/2025/02218',sp2dDate:'2025-12-28',paymentStatus:'paid',documentId:'doc-3-5',metadata:{source:'mock_reference'}}
];
export const projectAssetLinks: ProjectAssetLink[] = [{projectId:'prj-001',assetId:'asset-003',relation:'updated'},{projectId:'prj-001',assetId:'asset-004',relation:'surveyed'},{projectId:'prj-003',assetId:'asset-006',relation:'migrated'}];
