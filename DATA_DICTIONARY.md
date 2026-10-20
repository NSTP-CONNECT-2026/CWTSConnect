# CWTSConnect 2026 — Database Data Dictionary (Thesis Chapter 3)

**System Name**: CWTSConnect (NSTP-CWTS Decision Support & Volunteer Management Platform)  
**Database Management System (DBMS)**: PostgreSQL (Supabase Cloud Database)  
**Format Specification**: Academic Monochrome / Printer-Friendly (Black Text, White Background)  

---

## Talaan ng mga Aktibong Tables (Active Tables Index)

1. [users](#1-users)
2. [student_profiles](#2-student_profiles)
3. [otp_verifications](#3-otp_verifications)
4. [student_cmo_requirements](#4-student_cmo_requirements)
5. [community_requests](#5-community_requests)
6. [request_types](#6-request_types)
7. [skills](#7-skills)
8. [dss_match_results](#8-dss_match_results)
9. [deployments](#9-deployments)
10. [deployment_students](#10-deployment_students)
11. [attendance_records](#11-attendance_records)
12. [rendered_hours_summary](#12-rendered_hours_summary)
13. [make_up_requests](#13-make_up_requests)
14. [student_evaluations](#14-student_evaluations)
15. [student_feedback](#15-student_feedback)
16. [notifications](#16-notifications)
17. [notification_preferences](#17-notification_preferences)

---

### 1. users

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `user_id` | UUID | uuid | 16 bytes | Primary key identifier ng user account | `c3a8e1b2-4d5f-4a6c-8e9b-123456789abc` | PK |
| `email` | VARCHAR(255) | email | 255 | Opisyal na institutional email address (unique) | `juan.delacruz@cvsu.edu.ph` | UK |
| `password_hash` | TEXT | hashed string | - | Bcrypt cryptographic password hash string | `$2a$10$wK1xL7...` | - |
| `role` | VARCHAR(50) | text | 50 | Access role ('student', 'community_official', 'nstp_official') | `student` | - |
| `account_status` | VARCHAR(50) | text | 50 | Lifecycle status ('pending_verification', 'active', 'inactive') | `active` | - |
| `profile_status` | VARCHAR(50) | text | 50 | Katayuan ng profile form ('incomplete', 'complete') | `complete` | - |
| `cmo_compliance_status` | VARCHAR(50) | text | 50 | CHED CMO clearance status ('incomplete', 'compliant') | `compliant` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa at oras kung kailan ginawa ang tala | `2026-08-15 08:30:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa at oras ng huling pagbabago sa tala | `2026-10-12 14:22:15+08` | - |

---

### 2. student_profiles

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `profile_id` | UUID | uuid | 16 bytes | Primary key identifier ng student profile | `d4b9f2c3-5e6a-4b7d-9f0c-234567890def` | PK |
| `user_id` | UUID | uuid | 16 bytes | Foreign key na naka-link sa master user account | `c3a8e1b2-4d5f-4a6c-8e9b-123456789abc` | FK &rarr; users(user_id), UK |
| `full_name` | VARCHAR(255) | text | 255 | Buong pangalan ng mag-aaral | `Juan Protacio Dela Cruz` | - |
| `student_number` | VARCHAR(100) | alphanumeric | 100 | Opisyal na numero ng mag-aaral sa unibersidad | `2023-10492` | UK |
| `course` | VARCHAR(255) | text | 255 | Degree program / kursong kinabibilangan | `BS Information Technology` | - |
| `year_level` | VARCHAR(50) | text | 50 | Taon sa kolehiyo ('1st Year', '2nd Year', atbp.) | `2nd Year` | - |
| `section` | VARCHAR(50) | text | 50 | Klase / seksyon ng estudyante | `BSIT 2-1` | - |
| `nstp_component` | VARCHAR(100) | text | 100 | Kasalukuyang kinukuha na NSTP component ('CWTS') | `CWTS` | - |
| `contact_number` | VARCHAR(20) | numeric string | 20 | Numero ng telepono / cellphone ng estudyante | `09171234567` | - |
| `birthdate` | DATE | date | 4 bytes | Araw ng kapanganakan ng estudyante | `2004-05-18` | - |
| `sex` | VARCHAR(10) | text | 10 | Kasarian ng estudyante ('Male', 'Female') | `Male` | - |
| `complete_address` | TEXT | text | - | Kumpletong tirahan sa komunidad | `Blk 4 Lot 12 Sampaguita St.` | - |
| `barangay` | VARCHAR(255) | text | 255 | Barangay kung saan naninirahan | `San Jose` | - |
| `municipality` | VARCHAR(255) | text | 255 | Lungsod o bayan ng tirahan | `Dasmariñas` | - |
| `province` | VARCHAR(255) | text | 255 | Lalawigan ng tirahan | `Cavite` | - |
| `latitude` | DECIMAL(10,8) | decimal | 8 bytes | GPS latitude coordinate ng tirahan ng estudyante | `14.32941200` | - |
| `longitude` | DECIMAL(11,8) | decimal | 8 bytes | GPS longitude coordinate ng tirahan ng estudyante | `120.93674100` | - |
| `skills` | TEXT | text | - | Talaan ng mga kasanayan para sa outreach matching | `First Aid, Teaching, Literacy` | - |
| `emergency_contact_name` | VARCHAR(255) | text | 255 | Pangalan ng emergency contact person / magulang | `Maria Dela Cruz` | - |
| `emergency_contact_number` | VARCHAR(20) | numeric string | 20 | Numero ng emergency contact | `09189876543` | - |
| `emergency_contact_relationship` | VARCHAR(100) | text | 100 | Relasyon sa mag-aaral ('Mother', 'Father') | `Mother` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa at oras ng paglikha ng profile | `2026-08-16 09:00:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa at oras ng huling pag-update | `2026-09-01 11:15:30+08` | - |

---

### 3. otp_verifications

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `otp_id` | UUID | uuid | 16 bytes | Primary key identifier ng OTP token record | `e5c0a3d4-6f7b-4c8e-a01d-345678901ef0` | PK |
| `email` | VARCHAR(255) | email | 255 | Email address kung saan ipinadala ang OTP | `juan.delacruz@cvsu.edu.ph` | - |
| `otp_code` | VARCHAR(6) | numeric string | 6 | 6-digit cryptographic PIN code | `849201` | - |
| `expires_at` | TIMESTAMPTZ | timestamp | 8 bytes | Oras ng pag-expire ng OTP (10 minutong bisa) | `2026-10-12 14:40:00+08` | - |
| `is_used` | BOOLEAN | boolean | 1 byte | Flag kung nagamit na ang OTP code | `false` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa at oras ng pag-generate ng token | `2026-10-12 14:30:00+08` | - |

---

### 4. student_cmo_requirements

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `requirement_id` | UUID | uuid | 16 bytes | Primary key identifier ng submission | `f6d1b4e5-7a8c-4d9f-b12e-456789012fa1` | PK |
| `user_id` | UUID | uuid | 16 bytes | Foreign key ng estudyanteng nag-upload | `c3a8e1b2-4d5f-4a6c-8e9b-123456789abc` | FK &rarr; users(user_id) |
| `requirement_type` | VARCHAR(100) | text | 100 | Uri ng dokumento ('notarized_parent_waiver', atbp.) | `notarized_parent_waiver` | - |
| `file_name` | VARCHAR(255) | filename | 255 | Orihinal na pangalan ng uploaded file | `delacruz_parent_waiver_2026.pdf` | - |
| `file_path` | TEXT | path string | - | Internal storage path sa cloud repository | `waivers/2026/c3a8e1b2_waiver.pdf` | - |
| `file_url` | TEXT | url | - | Ligtas na public access URL para matingnan ang file | `https://res.cloudinary.com/.../waiver.pdf` | - |
| `file_type` | VARCHAR(50) | MIME type | 50 | MIME format ('application/pdf', 'image/jpeg') | `application/pdf` | - |
| `file_size` | INTEGER | integer | 4 bytes | Laki ng file sa bytes | `248512` | - |
| `status` | VARCHAR(50) | text | 50 | Review status ('pending', 'approved', 'rejected') | `approved` | - |
| `remarks` | TEXT | text | - | Puna o komento ng sumusing coordinator | `Verified notarized parent signature.` | - |
| `uploaded_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa at oras ng pag-upload | `2026-08-20 10:15:00+08` | - |
| `reviewed_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa at oras ng pagsusuri ng coordinator | `2026-08-22 15:45:00+08` | - |
| `reviewed_by` | UUID | uuid | 16 bytes | Foreign key ng CWTS coordinator na nag-review | `b2f9c8a1-3e4d-4c5b-9a8f-0123456789ab` | FK &rarr; users(user_id) |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Talaan ng petsa ng paglikha sa database | `2026-08-20 10:15:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Talaan ng petsa ng huling pagbabago | `2026-08-22 15:45:00+08` | - |

---

### 5. community_requests

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `request_id` | UUID | uuid | 16 bytes | Primary key identifier ng community request | `a1b2c3d4-e5f6-4a7b-8c9d-012345678901` | PK |
| `user_id` | UUID | uuid | 16 bytes | Foreign key ng Community Official na lumikha | `d9e8f7a6-b5c4-4d3e-2f1a-9876543210fe` | FK &rarr; users(user_id) |
| `community_name` | VARCHAR(255) | text | 255 | Pangalan ng barangay o LGU partner | `Barangay San Agustin` | - |
| `community_address` | TEXT | text | - | Pisikal na address ng punong tanggapan | `Barangay Hall, Provincial Road` | - |
| `barangay` | VARCHAR(100) | text | 100 | Barangay ng proyekto | `San Agustin` | - |
| `municipality` | VARCHAR(100) | text | 100 | Lungsod o bayan ng proyekto | `Trece Martires` | - |
| `province` | VARCHAR(100) | text | 100 | Lalawigan ng proyekto | `Cavite` | - |
| `latitude` | DECIMAL(10,8) | decimal | 8 bytes | GPS latitude coordinate ng deployment venue | `14.28312000` | - |
| `longitude` | DECIMAL(11,8) | decimal | 8 bytes | GPS longitude coordinate ng deployment venue | `120.87123000` | - |
| `activity_title` | VARCHAR(255) | text | 255 | Opisyal na pamagat ng outreach activity | `Community Literacy Training` | - |
| `activity_description` | TEXT | text | - | Layunin at saklaw ng proyekto sa barangay | `Weekend tutorial for youth.` | - |
| `activity_type` | VARCHAR(100) | text | 100 | Kategorya ('Literacy Program', 'Clean-up', atbp.) | `Computer Literacy Training` | - |
| `preferred_nstp_component` | VARCHAR(20) | text | 20 | Hiniling na component ('CWTS', 'LTS', 'Both') | `CWTS` | - |
| `students_needed` | INTEGER | integer | 4 bytes | Target na bilang ng student volunteers | `15` | - |
| `preferred_start_date` | DATE | date | 4 bytes | Inaasahang petsa ng simula ng deployment | `2026-10-01` | - |
| `preferred_end_date` | DATE | date | 4 bytes | Inaasahang petsa ng pagtatapos ng deployment | `2026-11-15` | - |
| `preferred_schedule` | VARCHAR(255) | text | 255 | Oras at araw ng serbisyo | `Saturdays, 8:00 AM - 12:00 PM` | - |
| `urgency_level` | VARCHAR(20) | text | 20 | Priyoridad ('Low', 'Medium', 'High') | `High` | - |
| `needed_skills` | TEXT[] | text array | - | Talaan ng kinakailangang kakayahan | `{'Teaching', 'Computer Literacy'}` | - |
| `target_beneficiaries` | VARCHAR(255) | text | 255 | Sektor na makikinabang sa serbisyo | `40 Out-of-school youth` | - |
| `special_instructions` | TEXT | text | - | Tagubilin sa kasuotan o kaligtasan | `Wear NSTP uniform and ID.` | - |
| `request_status` | VARCHAR(20) | text | 20 | Estado ng request ('pending', 'approved', atbp.) | `approved` | - |
| `review_notes` | TEXT | text | - | Komento ng Coordinator sa pagsusuri | `Approved with barangay endorsement.` | - |
| `reviewed_by` | UUID | uuid | 16 bytes | Foreign key ng Coordinator na sumuri | `b2f9c8a1-3e4d-4c5b-9a8f-0123456789ab` | FK &rarr; users(user_id) |
| `reviewed_at` | TIMESTAMPTZ | timestamp | 8 bytes | Oras kung kailan inaprubahan | `2026-09-10 14:00:00+08` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng pagsumite | `2026-09-05 11:20:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng huling pagbabago | `2026-09-10 14:00:00+08` | - |

---

### 6. request_types

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `type_id` | UUID | uuid | 16 bytes | Primary key identifier ng serbisyo | `b2c3d4e5-f6a7-4b8c-9d0e-123456789012` | PK |
| `name` | VARCHAR(255) | text | 255 | Opisyal na pangalan ng serbisyo | `Literacy and Numeracy Assistance` | UK |
| `description` | TEXT | text | - | Deskripsyon at saklaw ng serbisyo | `Tutorial sessions for basic literacy.` | - |
| `required_skills` | TEXT[] | text array | - | Karaniwang kailangang skills para sa gawain | `{'Teaching', 'Communication'}` | - |
| `is_active` | BOOLEAN | boolean | 1 byte | Katayuan kung aktibo ang serbisyo | `true` | - |
| `created_by` | UUID | uuid | 16 bytes | Foreign key ng nagtala sa catalog | `b2f9c8a1-3e4d-4c5b-9a8f-0123456789ab` | FK &rarr; users(user_id) |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng paglikha sa catalog | `2026-08-01 08:00:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng huling pagbago | `2026-08-01 08:00:00+08` | - |

---

### 7. skills

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `skill_id` | UUID | uuid | 16 bytes | Primary key identifier ng skill | `c3d4e5f6-a7b8-4c9d-0e1f-234567890123` | PK |
| `name` | VARCHAR(100) | text | 100 | Opisyal na pangalan ng kakayahan | `First Aid` | UK |
| `category` | VARCHAR(100) | text | 100 | Kategorya ('Health & Safety', 'Education') | `Health & Safety` | - |
| `description` | TEXT | text | - | Paliwanag sa kakayahan at saklaw nito | `Emergency response, CPR, vital signs.` | - |
| `is_active` | BOOLEAN | boolean | 1 byte | Katayuan kung aktibo sa DSS matching | `true` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng paglikha sa catalog | `2026-08-01 08:00:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng huling pagbago | `2026-08-01 08:00:00+08` | - |

---

### 8. dss_match_results

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `match_id` | UUID | uuid | 16 bytes | Primary key identifier ng match result | `d4e5f6a7-b8c9-4d0e-1f2a-345678901234` | PK |
| `request_id` | UUID | uuid | 16 bytes | Foreign key ng sinuring community request | `a1b2c3d4-e5f6-4a7b-8c9d-012345678901` | FK &rarr; community_requests(request_id) |
| `student_user_id` | UUID | uuid | 16 bytes | Foreign key ng kandidatong mag-aaral | `c3a8e1b2-4d5f-4a6c-8e9b-123456789abc` | FK &rarr; users(user_id) |
| `match_score` | DECIMAL(5,2) | percentage | 5 bytes | Kabuuang computed score (0.00 to 100.00%) | `94.50` | - |
| `match_label` | VARCHAR(50) | text | 50 | Tier ('Highly Recommended', 'Recommended') | `Highly Recommended` | - |
| `recommendation_rank` | INTEGER | integer | 4 bytes | Ranggo ng mag-aaral para sa proyektong ito | `1` | - |
| `location_score` | DECIMAL(5,2) | decimal | 5 bytes | Proximity score (Haversine Formula) | `98.00` | - |
| `skills_score` | DECIMAL(5,2) | decimal | 5 bytes | Score batay sa katugmang kakayahan | `95.00` | - |
| `component_score` | DECIMAL(5,2) | decimal | 5 bytes | Score batay sa angkop na track (CWTS) | `100.00` | - |
| `availability_score` | DECIMAL(5,2) | decimal | 5 bytes | Score batay sa iskedyul ng mag-aaral | `85.00` | - |
| `generated_by` | UUID | uuid | 16 bytes | Foreign key ng nagpatakbo ng DSS | `b2f9c8a1-3e4d-4c5b-9a8f-0123456789ab` | FK &rarr; users(user_id) |
| `generated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Oras ng pag-kalkula ng algorithm | `2026-09-12 16:30:00+08` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng pagka-record sa database | `2026-09-12 16:30:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng huling pagbago | `2026-09-12 16:30:00+08` | - |

---

### 9. deployments

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `deployment_id` | UUID | uuid | 16 bytes | Primary key identifier ng deployment batch | `e5f6a7b8-c9d0-4e1f-2a3b-456789012345` | PK |
| `request_id` | UUID | uuid | 16 bytes | Foreign key ng pinupunang community request | `a1b2c3d4-e5f6-4a7b-8c9d-012345678901` | FK &rarr; community_requests(request_id) |
| `deployment_batch_name` | VARCHAR(255) | text | 255 | Opisyal na pangalan ng deployment batch | `Batch 2026-A: Brgy. San Agustin Literacy` | - |
| `deployment_status` | VARCHAR(20) | text | 20 | Katayuan ('pending', 'active', 'ongoing', 'completed') | `active` | - |
| `assigned_by` | UUID | uuid | 16 bytes | Foreign key ng Coordinator na nag-atas | `b2f9c8a1-3e4d-4c5b-9a8f-0123456789ab` | FK &rarr; users(user_id) |
| `deployment_start_date` | DATE | date | 4 bytes | Petsa ng pormal na simula ng serbisyo | `2026-10-01` | - |
| `deployment_end_date` | DATE | date | 4 bytes | Petsa ng pagtatapos ng serbisyo | `2026-11-15` | - |
| `notes` | TEXT | text | - | Mga paalala at tagubilin ng coordinator | `Weekly Saturday sessions (4 hrs/day).` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Talaan ng petsa ng paglikha | `2026-09-15 10:00:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Talaan ng petsa ng huling pagbago | `2026-10-01 08:00:00+08` | - |

---

### 10. deployment_students

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `deployment_student_id` | UUID | uuid | 16 bytes | Primary key identifier ng assignment | `f6a7b8c9-d0e1-4f2a-3b4c-567890123456` | PK |
| `deployment_id` | UUID | uuid | 16 bytes | Foreign key ng target deployment batch | `e5f6a7b8-c9d0-4e1f-2a3b-456789012345` | FK &rarr; deployments(deployment_id) |
| `student_user_id` | UUID | uuid | 16 bytes | Foreign key ng itinalagang mag-aaral | `c3a8e1b2-4d5f-4a6c-8e9b-123456789abc` | FK &rarr; users(user_id) |
| `deployment_student_status` | VARCHAR(20) | text | 20 | Katayuan ng mag-aaral ('assigned', 'active') | `active` | - |
| `assigned_at` | TIMESTAMPTZ | timestamp | 8 bytes | Oras ng opisyal na pagtatalaga sa grupo | `2026-09-15 10:30:00+08` | - |
| `notes` | TEXT | text | - | Karagdagang gampanin sa pangkat | `Assigned as Lead Literacy Facilitator.` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Talaan ng petsa ng paglikha | `2026-09-15 10:30:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Talaan ng petsa ng huling pagbago | `2026-10-01 08:00:00+08` | - |

---

### 11. attendance_records

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `attendance_id` | UUID | uuid | 16 bytes | Primary key identifier ng DTR log | `a7b8c9d0-e1f2-4a3b-4c5d-678901234567` | PK |
| `deployment_id` | UUID | uuid | 16 bytes | Foreign key ng deployment batch | `e5f6a7b8-c9d0-4e1f-2a3b-456789012345` | FK &rarr; deployments(deployment_id) |
| `student_user_id` | UUID | uuid | 16 bytes | Foreign key ng mag-aaral | `c3a8e1b2-4d5f-4a6c-8e9b-123456789abc` | FK &rarr; users(user_id) |
| `attendance_date` | DATE | date | 4 bytes | Petsa ng pagdalo sa outreach site | `2026-10-04` | - |
| `check_in_time` | TIME | time | 8 bytes | Oras ng pagdating / simula ng serbisyo | `08:00:00` | - |
| `check_out_time` | TIME | time | 8 bytes | Oras ng pag-alis / pagtatapos ng serbisyo | `12:00:00` | - |
| `attendance_status` | VARCHAR(20) | text | 20 | Katayuan ('present', 'absent', 'late', 'excused') | `present` | - |
| `hours_rendered` | DECIMAL(5,2) | decimal | 5 bytes | Na-credit na oras para sa sesyon | `4.00` | - |
| `verified_by` | UUID | uuid | 16 bytes | Foreign key ng Community Official na nagpatunay | `d9e8f7a6-b5c4-4d3e-2f1a-9876543210fe` | FK &rarr; users(user_id) |
| `verified_at` | TIMESTAMPTZ | timestamp | 8 bytes | Oras kung kailan pinagtibay ang attendance | `2026-10-04 12:15:00+08` | - |
| `student_remarks` | TEXT | text | - | Ulat ng gawain ng estudyante | `Facilitated reading module for Grade 2.` | - |
| `nstp_remarks` | TEXT | text | - | Puna ng opisyal ng komunidad | `Punctual and proactive during tutoring.` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Oras ng pagka-record sa database | `2026-10-04 08:05:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Oras ng huling pag-update | `2026-10-04 12:15:00+08` | - |

---

### 12. rendered_hours_summary

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `summary_id` | UUID | uuid | 16 bytes | Primary key identifier ng summary tracker | `b8c9d0e1-f2a3-4b4c-5d6e-789012345678` | PK |
| `deployment_id` | UUID | uuid | 16 bytes | Foreign key ng deployment batch | `e5f6a7b8-c9d0-4e1f-2a3b-456789012345` | FK &rarr; deployments(deployment_id) |
| `student_user_id` | UUID | uuid | 16 bytes | Foreign key ng mag-aaral | `c3a8e1b2-4d5f-4a6c-8e9b-123456789abc` | FK &rarr; users(user_id) |
| `total_hours_required` | DECIMAL(5,2) | decimal | 5 bytes | Kinakailangang oras ayon sa CHED (54.00) | `54.00` | - |
| `total_hours_rendered` | DECIMAL(5,2) | decimal | 5 bytes | Kabuuang oras na naisagawa ng estudyante | `54.00` | - |
| `total_hours_verified` | DECIMAL(5,2) | decimal | 5 bytes | Oras na opisyal na pinagtibay ng opisyal | `54.00` | - |
| `total_hours_pending` | DECIMAL(5,2) | decimal | 5 bytes | Oras na nakabinbin ang beripikasyon | `0.00` | - |
| `total_sessions` | INTEGER | integer | 4 bytes | Kabuuang bilang ng nakatakdang sesyon | `14` | - |
| `present_count` | INTEGER | integer | 4 bytes | Bilang ng sesyon na dinaluhan (present) | `14` | - |
| `absent_count` | INTEGER | integer | 4 bytes | Bilang ng sesyon na hindi dinaluhan (absent) | `0` | - |
| `late_count` | INTEGER | integer | 4 bytes | Bilang ng sesyon na nahuli (late) | `0` | - |
| `excused_count` | INTEGER | integer | 4 bytes | Bilang ng sesyon na may pahintulot (excused) | `0` | - |
| `make_up_count` | INTEGER | integer | 4 bytes | Bilang ng naisagawang make-up sessions | `0` | - |
| `completion_percentage` | DECIMAL(5,2) | percentage | 5 bytes | Bahagdan ng natapos na oras (0.00 to 100.00%) | `100.00` | - |
| `completion_status` | VARCHAR(20) | text | 20 | Estado ('in_progress', 'completed') | `completed` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng paglikha ng summary tracker | `2026-09-15 10:30:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Huling petsa ng pagbago | `2026-11-15 13:00:00+08` | - |

---

### 13. make_up_requests

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `make_up_id` | UUID | uuid | 16 bytes | Primary key identifier ng make-up request | `c9d0e1f2-a3b4-4c5d-6e7f-890123456789` | PK |
| `attendance_id` | UUID | uuid | 16 bytes | Foreign key ng na-miss na attendance record | `a7b8c9d0-e1f2-4a3b-4c5d-678901234567` | FK &rarr; attendance_records |
| `student_user_id` | UUID | uuid | 16 bytes | Foreign key ng estudyanteng nagpepetisyon | `c3a8e1b2-4d5f-4a6c-8e9b-123456789abc` | FK &rarr; users(user_id) |
| `deployment_id` | UUID | uuid | 16 bytes | Foreign key ng deployment batch | `e5f6a7b8-c9d0-4e1f-2a3b-456789012345` | FK &rarr; deployments |
| `missed_date` | DATE | date | 4 bytes | Petsa kung kailan lumiban ang mag-aaral | `2026-10-18` | - |
| `reason` | TEXT | text | - | Makatarungang dahilan ng pagliban | `Medical reason with excuse letter.` | - |
| `proposed_make_up_date` | DATE | date | 4 bytes | Iminumungkahing petsa ng pagbawi | `2026-10-25` | - |
| `proposed_make_up_time` | TIME | time | 8 bytes | Iminumungkahing oras ng pagbawi | `08:00:00` | - |
| `request_status` | VARCHAR(20) | text | 20 | Katayuan ('pending', 'approved', 'rejected') | `approved` | - |
| `reviewed_by` | UUID | uuid | 16 bytes | Foreign key ng sumuring coordinator | `b2f9c8a1-3e4d-4c5b-9a8f-0123456789ab` | FK &rarr; users(user_id) |
| `reviewed_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng pag-apruba ng petisyon | `2026-10-20 09:30:00+08` | - |
| `nstp_remarks` | TEXT | text | - | Instruksyon sa pagbawi ng oras | `Render 4 hours at Barangay Center.` | - |
| `actual_make_up_date` | DATE | date | 4 bytes | Tunay na araw ng pagsasagawa | `2026-10-25` | - |
| `actual_make_up_time` | TIME | time | 8 bytes | Tunay na oras ng pagsasagawa | `08:00:00` | - |
| `hours_rendered` | DECIMAL(5,2) | decimal | 5 bytes | Na-credit na oras mula sa make-up | `4.00` | - |
| `completion_verified` | BOOLEAN | boolean | 1 byte | Katibayan na pinagtibay ng opisyal | `true` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng paglikha sa database | `2026-10-19 14:00:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Huling petsa ng pagbago | `2026-10-25 12:30:00+08` | - |

---

### 14. student_evaluations

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `evaluation_id` | UUID | uuid | 16 bytes | Primary key identifier ng student evaluation | `d0e1f2a3-b4c5-4d6e-7f8a-901234567890` | PK |
| `deployment_id` | UUID | uuid | 16 bytes | Foreign key ng deployment batch | `e5f6a7b8-c9d0-4e1f-2a3b-456789012345` | FK &rarr; deployments |
| `student_user_id` | UUID | uuid | 16 bytes | Foreign key ng sinusuring mag-aaral | `c3a8e1b2-4d5f-4a6c-8e9b-123456789abc` | FK &rarr; users(user_id) |
| `evaluator_user_id` | UUID | uuid | 16 bytes | Foreign key ng opisyal na nag-evaluate | `d9e8f7a6-b5c4-4d3e-2f1a-9876543210fe` | FK &rarr; users(user_id) |
| `evaluator_name` | TEXT | text | - | Buong pangalan ng opisyal ng barangay | `Hon. Roberto Santos` | - |
| `student_name` | TEXT | text | - | Pangalan ng sinusuring mag-aaral | `Juan Protacio Dela Cruz` | - |
| `community_name` | TEXT | text | - | Pangalan ng partner barangay | `Barangay San Agustin` | - |
| `activity_title` | TEXT | text | - | Pamagat ng outreach project | `Community Literacy Program` | - |
| `rating_punctuality` | DECIMAL(3,1) | decimal | 5 bytes | Marka sa pagdating sa takdang oras (1.0 to 5.0) | `5.0` | - |
| `rating_community_engagement` | DECIMAL(3,1) | decimal | 5 bytes | Marka sa pakikitungo sa mamamayan | `4.8` | - |
| `rating_teamwork` | DECIMAL(3,1) | decimal | 5 bytes | Marka sa pakikipagtulungan sa grupo | `5.0` | - |
| `rating_initiative_attitude` | DECIMAL(3,1) | decimal | 5 bytes | Marka sa pagkukusa at disiplina | `4.9` | - |
| `overall_score` | DECIMAL(3,2) | decimal | 5 bytes | Pinal na computed average rating | `4.93` | - |
| `performance_grade` | VARCHAR(50) | text | 50 | Qualitative grade ('Outstanding', atbp.) | `Outstanding` | - |
| `evaluator_remarks` | TEXT | text | - | Pahayag ng pasasalamat at puna ng opisyal | `Showed great dedication in teaching.` | - |
| `evaluation_date` | DATE | date | 4 bytes | Petsa ng pagsasagawa ng evaluation | `2026-11-16` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng paglikha sa database | `2026-11-16 14:00:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng huling pagbago | `2026-11-16 14:00:00+08` | - |

---

### 15. student_feedback

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `feedback_id` | UUID | uuid | 16 bytes | Primary key identifier ng feedback entry | `e1f2a3b4-c5d6-4e7f-8a9b-012345678901` | PK |
| `deployment_id` | UUID | uuid | 16 bytes | Foreign key ng deployment batch | `e5f6a7b8-c9d0-4e1f-2a3b-456789012345` | FK &rarr; deployments |
| `student_user_id` | UUID | uuid | 16 bytes | Foreign key ng estudyante (kung indibidwal) | `c3a8e1b2-4d5f-4a6c-8e9b-123456789abc` | FK &rarr; users(user_id) |
| `community_user_id` | UUID | uuid | 16 bytes | Foreign key ng opisyal na nagsumite | `d9e8f7a6-b5c4-4d3e-2f1a-9876543210fe` | FK &rarr; users(user_id) |
| `community_name` | TEXT | text | - | Pangalan ng partner komunidad | `Barangay San Agustin` | - |
| `activity_title` | TEXT | text | - | Pamagat ng community outreach activity | `Community Literacy Program` | - |
| `rating` | INTEGER | integer | 4 bytes | Kasiyahan sa serbisyo (1 hanggang 5 stars) | `5` | - |
| `feedback_type` | VARCHAR(50) | text | 50 | Uri ng feedback ('General Feedback') | `General Feedback` | - |
| `comments` | TEXT | text | - | Komento at rekomendasyon ng komunidad | `The program made a great impact on kids.` | - |
| `submitted_by` | TEXT | text | - | Pangalan ng sumagot sa pagsusuri | `Hon. Roberto Santos` | - |
| `date_submitted` | DATE | date | 4 bytes | Petsa ng pagsusumite | `2026-11-16` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Talaan ng petsa sa database | `2026-11-16 14:30:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Huling petsa ng pagbago | `2026-11-16 14:30:00+08` | - |

---

### 16. notifications

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `notification_id` | UUID | uuid | 16 bytes | Primary key identifier ng notification | `f2a3b4c5-d6e7-4f8a-9b0c-123456789012` | PK |
| `user_id` | UUID | uuid | 16 bytes | Foreign key ng tumanggap na user | `c3a8e1b2-4d5f-4a6c-8e9b-123456789abc` | FK &rarr; users(user_id) |
| `notification_type` | VARCHAR(50) | text | 50 | Kategorya ('deployment_assigned', atbp.) | `deployment_assigned` | - |
| `title` | VARCHAR(255) | text | 255 | Pamagat ng alerto | `Deployment Assignment Notice` | - |
| `message` | TEXT | text | - | Detalyadong mensahe ng notipikasyon | `You have been deployed to Brgy. San Agustin.` | - |
| `related_deployment_id` | UUID | uuid | 16 bytes | Kaugnay na deployment ID | `e5f6a7b8-c9d0-4e1f-2a3b-456789012345` | FK &rarr; deployments |
| `related_attendance_id` | UUID | uuid | 16 bytes | Kaugnay na attendance ID | `a7b8c9d0-e1f2-4a3b-4c5d-678901234567` | FK &rarr; attendance_records |
| `is_read` | BOOLEAN | boolean | 1 byte | Katayuan kung nabasa na ng user | `false` | - |
| `priority` | VARCHAR(20) | text | 20 | Antas ng priyoridad ('low', 'normal', 'high') | `high` | - |
| `action_url` | TEXT | url | - | Direct web link papunta sa target module | `/student/deployment.html` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Oras ng pagpapadala ng alerto | `2026-09-15 10:30:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Huling pagbago | `2026-09-15 10:30:00+08` | - |

---

### 17. notification_preferences

| Field Name | Data Type | Data Format | Field Size | Description | Example | Relationship |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `preference_id` | UUID | uuid | 16 bytes | Primary key identifier ng preference setting | `a3b4c5d6-e7f8-4a9b-0c1d-234567890123` | PK |
| `user_id` | UUID | uuid | 16 bytes | Foreign key ng user account | `c3a8e1b2-4d5f-4a6c-8e9b-123456789abc` | FK &rarr; users(user_id), UK |
| `email_notifications` | BOOLEAN | boolean | 1 byte | Pahintulot sa pagpapadala ng SMTP emails | `true` | - |
| `in_app_notifications` | BOOLEAN | boolean | 1 byte | Pahintulot sa notification badges sa UI | `true` | - |
| `attendance_reminders` | BOOLEAN | boolean | 1 byte | Pahintulot sa automated DTR log reminders | `true` | - |
| `announcement_alerts` | BOOLEAN | boolean | 1 byte | Pahintulot sa mga broadcast announcements | `true` | - |
| `created_at` | TIMESTAMPTZ | timestamp | 8 bytes | Petsa ng paglikha ng setting | `2026-08-15 08:30:00+08` | - |
| `updated_at` | TIMESTAMPTZ | timestamp | 8 bytes | Huling pagbago sa configuration | `2026-08-15 08:30:00+08` | - |
