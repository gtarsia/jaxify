var ajax = {
    find: function(id, filter) {
        return $.ajax({
            url: '/find/' + id,
            method: 'get',
            data: {filter: filter}
        })
    },
    delete: function() {
        return $.ajax({
            url: '/delete',
            method: 'delete'
        })
    }
}