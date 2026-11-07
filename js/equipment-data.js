/* ===== DATA ALAT BERAT EXCABASE ===== */
/* Data spesifikasi perlu disesuaikan dengan model dan konfigurasi aktual. */

const equipmentData = [
    {
        id: "excavator",
        name: "Excavator",
        category: "earthmoving",
        description: "Penggalian, pemuatan material, dan pekerjaan tanah.",
        icon: "🚜",
        models: [
            {
                manufacturer: "Caterpillar",
                model: "Cat 320",
                specifications: {
                    bucketCapacity: "1,19 m³",
                    enginePower: "128,5 kW",
                    operatingWeight: "21.900 kg",
                    maxDiggingDepth: "6.720 mm"
                },
                verification: "Sebagian terverifikasi",
                source: "https://www.cat.com/en_US/products/new/equipment/excavators/medium-excavators/126532.html"
            },
            {
                manufacturer: "Komatsu",
                model: "PC200-10M0 CE",
                specifications: {
                    bucketCapacity: "1,2 m³",
                    enginePower: "165 HP",
                    operatingWeight: "20.500 kg",
                    maxDiggingDepth: "6.515 mm"
                },
                verification: "Terverifikasi dari sumber resmi",
                source: "https://www.komatsu.co.id/products/detail/pc200-10m0-ce-202408170636"
            },
            {
                manufacturer: "Hitachi",
                model: "ZX200-5G",
                specifications: {
                    bucketCapacity: "0,51–1,20 m³",
                    enginePower: "125 kW",
                    operatingWeight: "19.800 kg",
                    maxDiggingDepth: "Perlu verifikasi brosur"
                },
                verification: "Spesifikasi utama terverifikasi",
                source: "https://www.hitachicm.com/sg/en/machinery/excavators/medium-excavators/product.zx200-5g/"
            }
        ]
    },

    {
    id: "bulldozer",
    name: "Bulldozer",
    category: "earthmoving",
    description: "Pembersihan lahan, penggusuran, dan perataan awal.",
    icon: "🚧",
    models: [
        {
            manufacturer: "Caterpillar",
            model: "Cat D6",
            specifications: {
                bladeCapacity: "5,7 m³ (SU blade)",
                bladeCapacityM3: 5.7,
                enginePower: "161 kW",
                operatingWeight: "23.012 kg (SU blade)"
            },
            verification: "Terverifikasi dari halaman resmi Caterpillar. Berat dan kapasitas blade mengikuti konfigurasi SU.",
            source: "https://www.cat.com/en_US/products/new/equipment/dozers/medium-dozers/15969751.html"
        },
        {
            manufacturer: "Komatsu",
            model: "D65EX-16",
            specifications: {
                bladeCapacity: "5,6 m³",
                bladeCapacityM3: 5.6,
                enginePower: "155 kW",
                operatingWeight: "19.510 kg"
            },
            verification: "Terverifikasi dari halaman resmi Komatsu.",
            source: "https://www.komatsu.com/en-ae/products/equipment/dozers/crawler-dozers/d65ex-16"
        },
        {
            manufacturer: "Shantui",
            model: "SD16",
            specifications: {
                enginePower: "131 kW",
                operatingWeight: "17.000 kg"
            },
            verification: "Daya dan berat standar terverifikasi dari halaman resmi Shantui. Kapasitas blade belum dicantumkan karena belum terverifikasi.",
            source: "https://www.shantui.com/product/pro-detail-1303974.htm"
        }
    ]
},

    {
        id: "dumptruck",
        name: "Dump Truck",
        category: "transport",
        description: "Pengangkutan material hasil galian dan timbunan.",
        icon: "🚛",
        models: [
            {
                manufacturer: "Komatsu",
                model: "HD325-7",
                specifications: {
                    payload: "36,5 ton",
                    bodyCapacity: "24 m³ (SAE)",
                    enginePower: "386 kW (gross)"
                },
                verification: "Spesifikasi resmi Komatsu. Daya mesin gross 386 kW; daya net tercantum 371 kW. Kapasitas bak 24 m³ SAE.",
                source: "https://www.komatsu.eu/en/product-archive/rigid-dump-trucks/hd325-7"
            },
                        {
                manufacturer: "Volvo",
                model: "FMX 400",
                specifications: {
                    enginePower: "400 hp (≈ 294 kW)",
                    payload: "Belum terverifikasi untuk varian spesifik",
                    bodyCapacity: "Belum terverifikasi untuk konfigurasi bak"
                },
                verification: "Daya 400 hp perlu dicocokkan dengan tahun dan varian FMX 400. Payload dan kapasitas bak mengikuti konfigurasi chassis serta karoseri.",
                source: "https://www.volvotrucks.id/id-id/trucks/models/volvo-fmx/specifications.html"
            },
            {
                manufacturer: "Hino",
                model: "500 FM 235 JD",
                specifications: {
                    enginePower: "235 PS (≈ 173 kW)",
                    grossVehicleWeight: "26.000 kg",
                    payload: "Bergantung berat karoseri",
                    bodyCapacity: "Bergantung konfigurasi bak"
                },
                verification: "Varian Hino 500 FM 235 JD 6×4. Halaman resmi mencantumkan daya 235 PS dan berat total kendaraan 26.000 kg. Payload efektif harus dikurangi berat karoseri dan perlengkapan.",
                source: "https://www.hino.co.id/product-detail/2/fm-235-jd-new"
            }
        ]
    },

        {
        id: "wheelloader",
        name: "Wheel Loader",
        category: "loading",
        description: "Pemuatan dan pemindahan material menggunakan bucket.",
        icon: "🏗️",
        models: [
            {
                manufacturer: "Caterpillar",
                model: "Cat 950",
                specifications: {
                    bucketCapacity: "Tergantung konfigurasi bucket",
                    enginePower: "186 kW",
                    operatingWeight: "19.260 kg"
                },
                verification: "Daya 186 kW berdasarkan ISO 14396 dan berat operasi 19.260 kg dari halaman resmi Cat 950. Kapasitas bucket bergantung konfigurasi.",
                source: "https://www.cat.com/en_US/products/new/equipment/wheel-loaders/medium-wheel-loaders/130308.html"
            },
            {
                manufacturer: "Komatsu",
                model: "WA380-8",
                specifications: {
                    bucketCapacity: "2,7–3,3 m³",
                    enginePower: "143 kW",
                    operatingWeight: "18.385–19.020 kg"
                },
                verification: "Spesifikasi resmi Komatsu. Rentang bucket dan berat operasi bergantung konfigurasi unit.",
                source: "https://www.komatsu.com/en-us/products/equipment/wheel-loaders/wa380-8"
            },
            {
                manufacturer: "Volvo",
                model: "L120H",
                specifications: {
                    bucketCapacity: "2,6–9,5 m³",
                    enginePower: "180 kW (gross)",
                    operatingWeight: "19.000–21.600 kg"
                },
                verification: "Spesifikasi resmi Volvo CE. Kapasitas bucket dan berat operasi bergantung konfigurasi. Daya 180 kW merupakan daya gross.",
                source: "https://www.volvoce.com/asia/products/wheel-loaders/l120h/"
            }
        ]
    },

        {
        id: "motorgrader",
        name: "Motor Grader",
        category: "finishing",
        description: "Perataan permukaan dan pembentukan kemiringan jalan.",
        icon: "🛣️",
        models: [
            {
                manufacturer: "Caterpillar",
                model: "Cat 140",
                specifications: {
                    bladeWidth: "3,7 m",
                    enginePower: "186 kW",
                    operatingWeight: "20.236 kg"
                },
                verification: "Spesifikasi resmi Cat 140: daya net 186 kW, blade 3,7 m, dan berat operasi typically equipped 20.236 kg. Spesifikasi dapat berbeda menurut generasi dan konfigurasi.",
                source: "https://www.cat.com/en_US/products/new/equipment/motor-graders/motor-graders/15969811.html"
            },
            {
                manufacturer: "Komatsu",
                model: "GD655-6",
                specifications: {
                    bladeWidth: "4,0 m (14 ft)",
                    enginePower: "163 kW (net)",
                    operatingWeight: "16.940 kg"
                },
                verification: "Spesifikasi resmi Komatsu GD655-6: blade 4,0 m, daya net 163 kW, dan berat operasi sekitar 16.940 kg.",
                source: "https://www.komatsu.com/en-us/products/equipment/motor-graders/gd655-6"
            },
            {
                manufacturer: "XCMG",
                model: "GR180",
                specifications: {
                    bladeWidth: "3,66 m",
                    enginePower: "142 kW",
                    operatingWeight: "15.400 kg"
                },
                verification: "Spesifikasi resmi XCMG GR180: blade 3.660 mm, daya 142 kW pada 2.200 rpm, dan berat standar 15.400 kg.",
                source: "https://www.xcmgglobal.com/product/d-series-motor-grader/gr180/"
            }
        ]
    },

        {
        id: "compactor",
        name: "Compactor",
        category: "finishing",
        description: "Pemadatan tanah dan lapisan konstruksi menggunakan drum.",
        icon: "🛞",
        models: [
            {
                manufacturer: "Caterpillar",
                model: "Cat CS11",
                specifications: {
                    compactionWidth: "2,134 m",
                    operatingWeight: "10.806 kg (dengan kabin)",
                    vibrationFrequency: "30,5 Hz",
                    enginePower: "96,5 kW (ISO 14396)"
                },
                verification: "Spesifikasi resmi Cat CS11 Tier 3: lebar pemadatan 2.134 mm, berat operasi 10.806 kg dengan kabin, frekuensi getaran standar 30,5 Hz, dan daya ISO 14396 96,5 kW. Berat mengikuti konfigurasi kabin.",
                source: "https://www.cat.com/id_ID/products/new/equipment/compactors/vibratory-soil-compactors/119720.html"
            },
            {
                manufacturer: "Caterpillar",
                model: "Cat CS11 GC",
                specifications: {
                    compactionWidth: "2,134 m",
                    operatingWeight: "11.238 kg (dengan kabin)",
                    vibrationFrequency: "30–33 Hz",
                    enginePower: "90 kW (ISO 14396)"
                },
                verification: "Spesifikasi resmi Cat CS11 GC: lebar pemadatan 2.134 mm, berat operasi sekitar 11.238 kg dengan kabin, frekuensi getaran standar 30–33 Hz, dan daya ISO 14396 90 kW.",
                source: "https://www.cat.com/en_US/products/new/equipment/compactors/vibratory-soil-compactors/106380.html"
            },
            {
                manufacturer: "Caterpillar",
                model: "Cat CP11 GC",
                specifications: {
                    compactionWidth: "2,134 m",
                    operatingWeight: "11.389 kg (dengan kabin)",
                    vibrationFrequency: "Periksa konfigurasi",
                    enginePower: "90 kW (ISO 14396)"
                },
                verification: "Spesifikasi resmi Cat CP11 GC: lebar pemadatan 2.134 mm dan berat operasi sekitar 11.389 kg dengan kabin. Frekuensi getaran perlu diperiksa pada konfigurasi unit yang dipilih.",
                source: "https://www.cat.com/en_US/products/new/equipment/compactors/vibratory-soil-compactors/106382.html"
            }
        ]
    },
];