const tienNghiMap = {
    'dieuHoa': 'Điều hòa',
    'nongLanh': 'Nóng lạnh',
    'tuLanh': 'Tủ lạnh',
    'giuong': 'Giường',
    'tuQuanAo': 'Tủ quần áo',
    'banGhe': 'Bàn ghế',
    'wifi': 'WiFi',
    'mayGiat': 'Máy giặt',
    'bep': 'Bếp',
    'banlamviec': 'Bàn làm việc',
    'ghe': 'Ghế',
    'tivi': 'TV',
    'phongtam': 'Phòng tắm',
    'bancong': 'Ban công',
};

const formatAmenity = (val) => {
    if (!val) return '';
    const lowerVal = val.toLowerCase();
    if (tienNghiMap[val]) return tienNghiMap[val];
    const match = Object.entries(tienNghiMap).find(([k]) => k.toLowerCase() === lowerVal);
    if (match) return match[1];
    return val;
};

async function testFilter() {
    const url = 'http://localhost:3000/api/phong-public';
    try {
        const response = await fetch(url);
        const result = await response.json();
        const phongList = result.data;
        console.log('Total rooms fetched:', phongList.length);

        const searchTerm = '';
        const searchLower = searchTerm.toLowerCase();
        const selectedCity = 'all';
        const selectedDistrict = 'all';
        const selectedToaNha = 'all';
        const selectedAmenities = [];

        const filtered = phongList.filter(phong => {
            const pToaNha = phong.toaNha; // It's populated in the API
            
            const matchesSearch =
                phong.maPhong.toLowerCase().includes(searchLower) ||
                (phong.moTa && phong.moTa.toLowerCase().includes(searchLower)) ||
                (pToaNha?.tenToaNha?.toLowerCase().includes(searchLower));

            const matchesCity = selectedCity === 'all' || pToaNha?.diaChi?.thanhPho === selectedCity;
            const matchesDistrict = selectedDistrict === 'all' || pToaNha?.diaChi?.quan === selectedDistrict;
            const matchesToaNha = selectedToaNha === 'all' || (typeof phong.toaNha === 'string' ? phong.toaNha : phong.toaNha._id) === selectedToaNha;

            const matchesAmenities = selectedAmenities.length === 0 ||
                selectedAmenities.every(amenity =>
                    phong.tienNghi?.map(formatAmenity).includes(amenity)
                );

            return matchesSearch && matchesCity && matchesDistrict && matchesToaNha && matchesAmenities;
        });

        console.log('Filtered Count:', filtered.length);
        if (filtered.length === 0 && phongList.length > 0) {
            console.log('DEBUG: First room details:');
            const p = phongList[0];
            console.log('maPhong:', p.maPhong);
            console.log('matchesSearch:', p.maPhong.toLowerCase().includes(searchLower));
            console.log('matchesCity:', selectedCity === 'all' || p.toaNha?.diaChi?.thanhPho === selectedCity);
            // ...
        }
    } catch (err) {
        console.error(err);
    }
}

testFilter();
