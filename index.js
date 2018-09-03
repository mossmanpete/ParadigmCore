let app = require('lotion')({
    initialState: {
        count: 0
    }
});

app.use((state, tx) => {
    // console.log(tx);
    state.count++;
});

app.listen(3000);