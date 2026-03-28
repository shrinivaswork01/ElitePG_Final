import re

# 1. Update TenantsPage to use Relational Fetching
filepath = 'src/pages/TenantsPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Change the hook to fetch room_number relationally
hook_replacement = """  const { data: paginatedTenants, totalCount, isLoading, page, setPage, limit, refetch } = usePaginatedData<any>({
    table: 'tenants',
    select: '*, rooms(room_number)',
    ilikeFilters: { name: searchTerm, email: searchTerm },
    filters: filterStatus !== 'all' ? { status: filterStatus } : undefined
  });"""
content = re.sub(r'const \{ data: paginatedTenants[^}]+table: \'tenants\',[^\}]+}\);', hook_replacement, content)

# Change grid rendering to use the relational data
content = content.replace("const room = rooms.find(r => r.id === t.roomId);", "const roomNumber = t.rooms?.room_number;")
content = content.replace("{room?.roomNumber || 'N/A'}", "{roomNumber || 'N/A'}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update PaymentsPage to use Relational Fetching
filepath = 'src/pages/PaymentsPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

hook_replacement = """  const { data: paginatedPayments, totalCount, isLoading, page, setPage, limit, refetch } = usePaginatedData<any>({
    table: 'payments',
    select: '*, tenants(name, rooms(room_number))',
    ilikeFilters: { transaction_id: searchTerm },
    filters: filterStatus !== 'all' ? { status: filterStatus } : undefined,
    orderBy: { column: 'payment_date', ascending: false }
  });"""
content = re.sub(r'const \{ data: paginatedPayments[^}]+table: \'payments\',[^\}]+}\);', hook_replacement, content)

# Change grid rendering
render_block = """const tenantName = p.tenants?.name;
        const roomNumber = p.tenants?.rooms?.room_number;"""
content = re.sub(r'const tenant = tenants\.find\(t => t\.id === p\.tenantId\);\s+const room = rooms\.find\(r => r\.id === tenant\?\.roomId\);', render_block, content)
content = content.replace("{tenant?.name?.charAt(0) || '?'}", "{tenantName?.charAt(0) || '?'}")
content = content.replace("{tenant?.name || 'Unknown'}", "{tenantName || 'Unknown'}")
content = content.replace("{room?.roomNumber || 'N/A'}", "{roomNumber || 'N/A'}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated relational fetching in Tenants and Payments.")
